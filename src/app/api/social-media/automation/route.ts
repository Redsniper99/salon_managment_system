import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { socialMediaService } from '@/services/socialMedia';
import { processStoryImage } from '@/lib/image-editor';

// Supabase client with service role for automation
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Automatically assigns "pending" images to available future posting slots
 */
async function runScheduling() {
    console.log('📅 Running auto-scheduling logic...');

    // 1. Get schedule and slots
    const { data: schedule } = await supabase.from('story_schedule').select('*').single();
    if (!schedule || !schedule.enabled) {
        return { error: 'Schedule is disabled or not found' };
    }

    const { data: slots } = await supabase.from('posting_slots').select('*').eq('is_active', true).order('posting_time');
    if (!slots || slots.length === 0) {
        return { error: 'No active posting slots found. Please add at least one time slot.' };
    }

    // 2. Get pending images that aren't scheduled yet
    const { data: queue } = await supabase
        .from('story_images')
        .select('*')
        .eq('status', 'pending')
        .or(`scheduled_date.is.null,scheduled_date.lt.${new Date().toISOString().split('T')[0]}`)
        .order('created_at', { ascending: true });

    if (!queue || queue.length === 0) {
        return {
            imagesAssigned: 0,
            message: 'No unscheduled images in queue. Upload some images first.'
        };
    }

    // 3. Find open slots for the next 7 days
    const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let imagesAssigned = 0;
    const imagesToAssign = [...queue];

    for (let i = 0; i < 7 && imagesToAssign.length > 0; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        // Local date string YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const dayName = DAYS_OF_WEEK[date.getDay()];

        if (!schedule.posting_days.includes(dayName)) continue;

        for (const slot of slots) {
            if (imagesToAssign.length === 0) break;

            // Check if slot is already filled for this date
            const { count } = await supabase
                .from('story_images')
                .select('*', { count: 'exact', head: true })
                .eq('scheduled_date', dateStr)
                .eq('slot_id', slot.id)
                .neq('status', 'failed');

            if (count === 0) {
                // Assign the next image
                const image = imagesToAssign.shift()!;
                await supabase
                    .from('story_images')
                    .update({
                        scheduled_date: dateStr,
                        scheduled_time: slot.posting_time,
                        slot_id: slot.id
                    })
                    .eq('id', image.id);

                imagesAssigned++;
                console.log(`✅ Assigned image ${image.id} to ${dateStr} at ${slot.posting_time}`);
            }
        }
    }

    return {
        imagesAssigned,
        queuedUnscheduled: queue.length - imagesAssigned,
        slotsChecked: slots.length * 7,
        activeDays: schedule.posting_days
    };
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');

    // Simple secret check (optional, but recommended for production)
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    try {
        // 0. Auto-schedule pending images first
        const scheduleStats = await runScheduling();

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const currentDate = `${year}-${month}-${day}`;
        const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

        // 1. Diagnostics: Get state of the queue
        const { count: totalPending } = await supabase.from('story_images').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: unscheduledCount } = await supabase.from('story_images').select('*', { count: 'exact', head: true }).eq('status', 'pending').is('scheduled_date', null);
        const { count: todayCount } = await supabase.from('story_images').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('scheduled_date', currentDate);

        // 2. Fetch all pending images scheduled for today or before
        const { data: queue, error: queueError } = await supabase
            .from('story_images')
            .select(`
                *,
                slot:posting_slots(*, caption_template:caption_templates(*)),
                caption_template:caption_templates(*)
            `)
            .eq('status', 'pending')
            .not('scheduled_date', 'is', null)
            .lte('scheduled_date', currentDate);

        if (queueError) throw queueError;

        // 3. Filter by time manually to ensure accuracy
        const dueToPost = (queue || []).filter(item => {
            if (item.scheduled_date < currentDate) return true;
            return item.scheduled_time <= currentTime;
        });

        if (dueToPost.length === 0) {
            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
            const isTodayActive = scheduleStats?.activeDays?.includes(dayName);

            let message = 'No pending stories to post right now.';

            if (scheduleStats?.error) {
                message = `Automation paused: ${scheduleStats.error}`;
            } else if (scheduleStats?.message) {
                message = scheduleStats.message;
            } else if (!isTodayActive) {
                message = `Today (${dayName}) is not marked as an "Active Day" in your Schedule Settings. Please click the "${dayName.slice(0, 3)}" toggle and Save.`;
            } else {
                // Check if there are future posts today
                const futureCount = (queue || []).filter(item =>
                    item.scheduled_date === currentDate && item.scheduled_time > currentTime
                ).length;

                if (futureCount > 0) {
                    message = `You have ${futureCount} story(ies) scheduled for later today. They will post automatically at their set times.`;
                } else {
                    message += ` You have ${totalPending} total pending images (${todayCount} for today), but none are due yet. Check your Time Slots.`;
                }
            }

            return NextResponse.json({
                message,
                diagnostics: {
                    currentDate,
                    currentTime,
                    dayName,
                    isTodayActive,
                    counts: {
                        totalPending,
                        unscheduledCount,
                        todayCount,
                        dueCount: dueToPost.length
                    },
                    scheduleStats
                }
            });
        }

        // 2. Load Social Media Settings
        const settings = await socialMediaService.getSettings();
        if (!settings || !settings.is_connected) {
            return NextResponse.json({ error: 'Social media not connected' }, { status: 400 });
        }

        // Update last run timestamp
        await supabase
            .from('social_media_settings')
            .update({ updated_at: new Date().toISOString() }) // Using updated_at as a fallback or if last_automation_run isn't added yet
            .eq('id', settings.id);

        // Try to update last_automation_run if the column exists
        try {
            await supabase
                .from('social_media_settings')
                .update({ last_automation_run: new Date().toISOString() })
                .eq('id', settings.id);
        } catch (e) {
            console.log('last_automation_run column might not exist yet');
        }

        const results = [];

        for (const image of dueToPost) {
            try {
                // Update status to processing
                await supabase.from('story_images').update({ status: 'processing' }).eq('id', image.id);

                // A. Resolve Caption
                const caption = await socialMediaService.resolveCaption(image, image.slot);

                // B. Image Processing (Logo Overlay)
                let processedImageUrl = image.image_url;
                if (settings.logo_url) {
                    const processedBuffer = await processStoryImage({
                        imageUrl: image.image_url,
                        logoUrl: settings.logo_url,
                        logoPosition: settings.logo_position,
                        logoSize: settings.logo_size
                    });

                    // Upload processed image
                    const processedPath = `social-media/processed/proc_${image.id}.jpg`;
                    const { error: uploadError } = await supabase.storage
                        .from('social-media')
                        .upload(processedPath, processedBuffer, {
                            contentType: 'image/jpeg',
                            upsert: true
                        });

                    if (!uploadError) {
                        const { data: urlData } = supabase.storage
                            .from('social-media')
                            .getPublicUrl(processedPath);
                        processedImageUrl = urlData.publicUrl;
                    }
                }

                // C. Post to Meta
                const postResults: any = { facebook: null, instagram: null };

                // Post to Facebook Stories (2-step process is more reliable)
                if (settings.facebook_enabled && settings.facebook_page_id && settings.facebook_page_token) {
                    try {
                        // Step 1: Upload as unpublished photo
                        const fbUploadResponse = await fetch(
                            `https://graph.facebook.com/v21.0/${settings.facebook_page_id}/photos?url=${encodeURIComponent(processedImageUrl)}&published=false&access_token=${settings.facebook_page_token}`,
                            { method: 'POST' }
                        );
                        const fbUploadData = await fbUploadResponse.json();

                        if (fbUploadData.id) {
                            // Step 2: Publish as story
                            const fbStoryResponse = await fetch(
                                `https://graph.facebook.com/v21.0/${settings.facebook_page_id}/photo_stories?photo_id=${fbUploadData.id}&access_token=${settings.facebook_page_token}`,
                                { method: 'POST' }
                            );
                            postResults.facebook = await fbStoryResponse.json();
                            console.log(`✅ Facebook Story posted. ID: ${postResults.facebook?.id || 'none'}`);
                        } else {
                            postResults.facebook = { error: fbUploadData.error || 'Failed to upload photo for FB story' };
                        }
                    } catch (err: any) {
                        postResults.facebook = { error: err.message };
                    }
                }

                // Post to Instagram Stories
                if (settings.instagram_enabled && settings.instagram_account_id) {
                    try {
                        // Instagram publishing is a 2-step process
                        const containerResponse = await fetch(
                            `https://graph.facebook.com/v21.0/${settings.instagram_account_id}/media`,
                            {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    image_url: processedImageUrl,
                                    media_type: 'STORIES',
                                    access_token: settings.facebook_page_token
                                })
                            }
                        );
                        const containerData = await containerResponse.json();

                        if (containerData.id) {
                            const publishResponse = await fetch(
                                `https://graph.facebook.com/v21.0/${settings.instagram_account_id}/media_publish`,
                                {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        creation_id: containerData.id,
                                        access_token: settings.facebook_page_token
                                    })
                                }
                            );
                            postResults.instagram = await publishResponse.json();
                            console.log(`✅ Instagram Story posted. ID: ${postResults.instagram?.id || 'none'}`);
                        } else {
                            postResults.instagram = { error: containerData.error || 'Failed to create IG container' };
                        }
                    } catch (err: any) {
                        postResults.instagram = { error: err.message };
                    }
                }

                // D. Update Status
                await supabase.from('story_images').update({
                    status: 'posted',
                    processed_url: processedImageUrl,
                    posted_at: new Date().toISOString(),
                    facebook_post_id: postResults.facebook?.id || null,
                    instagram_post_id: postResults.instagram?.id || null,
                    error_message: (postResults.facebook?.error || postResults.instagram?.error) ? JSON.stringify(postResults) : null
                }).eq('id', image.id);

                results.push({ id: image.id, status: 'posted', postResults });

            } catch (error: any) {
                console.error(`Error processing story ${image.id}:`, error);
                await supabase.from('story_images').update({
                    status: 'failed',
                    error_message: error.message
                }).eq('id', image.id);
                results.push({ id: image.id, status: 'failed', error: error.message });
            }
        }

        return NextResponse.json({ results });

    } catch (error: any) {
        console.error('Automation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
