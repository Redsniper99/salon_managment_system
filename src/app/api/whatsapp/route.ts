
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { sendWhatsAppMessage, createTextMessage, createListMessage } from '@/lib/whatsapp';
import crypto from 'crypto';

// Verify request signature from Meta
function verifySignature(req: NextRequest, rawBody: string): boolean {
    const signature = req.headers.get('x-hub-signature-256');
    if (!signature) return false;

    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
        console.warn('WHATSAPP_APP_SECRET not set - skipping signature verification');
        return true; // Allow in dev if secret not configured
    }

    const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSig)
    );
}

// Verify Webhook (GET)
export async function GET(req: NextRequest) {
    const mode = req.nextUrl.searchParams.get('hub.mode');
    const token = req.nextUrl.searchParams.get('hub.verify_token');
    const challenge = req.nextUrl.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
}

// Handle Incoming Messages (POST)
export async function POST(req: NextRequest) {
    try {
        // Get raw body for signature verification
        const rawBody = await req.text();

        // Verify signature
        if (!verifySignature(req, rawBody)) {
            console.error('Invalid WhatsApp webhook signature');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = JSON.parse(rawBody);
        const supabase = getAdminClient();

        console.log('📩 WhatsApp Webhook received:', JSON.stringify(body, null, 2));

        // Check if this is a message from a user
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        console.log('📨 Extracted message:', message);

        if (message) {
            const from = message.from; // Phone number
            const text = message.text?.body || '';
            const interactive = message.interactive;

            console.log('📱 From:', from, '| Text:', text);

            // Get current session
            let { data: session } = await supabase
                .from('bot_sessions')
                .select('*')
                .eq('phone_number', from)
                .single();

            // Initialize session if new
            if (!session) {
                const { data: newSession, error } = await supabase
                    .from('bot_sessions')
                    .insert({ phone_number: from, status: 'MENU', temp_data: {} })
                    .select()
                    .single();
                session = newSession;
            }

            // --- LOGIC FLOW ---

            // 1. Reset / Start Over
            if (text.toLowerCase() === 'hi' || text.toLowerCase() === 'menu') {
                await supabase
                    .from('bot_sessions')
                    .update({ status: 'MENU', temp_data: {} })
                    .eq('phone_number', from);

                await sendWhatsAppMessage(from, createListMessage(
                    'Welcome to Salon!',
                    'How can we help you today?',
                    'Menu',
                    [{
                        title: 'Options',
                        rows: [
                            { id: 'BOOK_APPT', title: 'Book Appointment' },
                            { id: 'CHECK_APPT', title: 'Check My Booking' }
                        ]
                    }]
                ));
                return NextResponse.json({ success: true });
            }

            // 2. Handle Menu Selection
            if (session.status === 'MENU' && interactive?.type === 'list_reply') {
                const selectedId = interactive.list_reply.id;

                if (selectedId === 'BOOK_APPT') {
                    // Show service categories first
                    const categories = ['Hair', 'Beard', 'Facial', 'Bridal', 'Kids', 'Spa', 'Other'];
                    const rows = categories.map(cat => ({ id: `CAT_${cat}`, title: cat }));

                    await sendWhatsAppMessage(from, createListMessage(
                        'Select Category',
                        'What type of service are you looking for?',
                        'Categories',
                        [{ title: 'Service Categories', rows: rows }]
                    ));

                    await supabase
                        .from('bot_sessions')
                        .update({ status: 'SELECT_CATEGORY' })
                        .eq('phone_number', from);

                } else if (selectedId === 'CHECK_APPT') {
                    // Check for existing appointments
                    const { data: appointments } = await supabase
                        .from('appointments')
                        .select('*, services(*), staff(name)')
                        .or(`status.eq.Pending,status.eq.Confirmed`)
                        .order('appointment_date', { ascending: true })
                        .limit(3);

                    if (appointments && appointments.length > 0) {
                        let msg = '📅 *Your Upcoming Appointments:*\n\n';
                        appointments.forEach((apt: any, i: number) => {
                            const date = new Date(apt.appointment_date).toLocaleDateString();
                            msg += `${i + 1}. ${date} at ${apt.start_time}\n   Status: ${apt.status}\n\n`;
                        });
                        await sendWhatsAppMessage(from, createTextMessage(msg));
                    } else {
                        await sendWhatsAppMessage(from, createTextMessage('You have no upcoming appointments. Type "Hi" to book one!'));
                    }
                }
            }

            // 3. Handle Category Selection
            else if (session.status === 'SELECT_CATEGORY' && interactive?.list_reply) {
                const categoryId = interactive.list_reply.id;
                const category = categoryId.replace('CAT_', ''); // Extract category name

                // Fetch services in this category
                const { data: services } = await supabase
                    .from('services')
                    .select('id, name, price, duration')
                    .eq('category', category)
                    .eq('is_active', true)
                    .limit(10);

                if (services && services.length > 0) {
                    const rows = services.map((s: any) => ({
                        id: s.id,
                        title: s.name.substring(0, 24),
                        description: `Rs.${s.price} • ${s.duration}min`
                    }));

                    await sendWhatsAppMessage(from, createListMessage(
                        `${category} Services`,
                        `Select a ${category.toLowerCase()} service:`,
                        'Services',
                        [{ title: 'Available Services', rows: rows }]
                    ));

                    await supabase
                        .from('bot_sessions')
                        .update({
                            status: 'SELECT_SERVICE',
                            temp_data: { category }
                        })
                        .eq('phone_number', from);
                } else {
                    await sendWhatsAppMessage(from, createTextMessage(
                        `No ${category} services available. Type "menu" to try another category.`
                    ));
                }
            }

            // 4. Handle Service Selection
            else if (session.status === 'SELECT_SERVICE' && interactive?.list_reply) {
                const serviceId = interactive.list_reply.id;
                const serviceName = interactive.list_reply.title;

                await sendWhatsAppMessage(from, createTextMessage(
                    `✅ You chose *${serviceName}*\n\nPlease reply with a date:\n• Format: YYYY-MM-DD\n• Example: 2025-12-18`
                ));

                await supabase
                    .from('bot_sessions')
                    .update({
                        status: 'SELECT_DATE',
                        temp_data: { ...session.temp_data, service_id: serviceId, service_name: serviceName }
                    })
                    .eq('phone_number', from);
            }

            // 5. Handle Date Input → Ask for Time
            else if (session.status === 'SELECT_DATE' && text) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(text)) {
                    await sendWhatsAppMessage(from, createTextMessage('❌ Invalid format. Please use YYYY-MM-DD (e.g. 2025-12-18).'));
                    return NextResponse.json({ success: true });
                }

                // Check if date is in the past
                const selectedDate = new Date(text);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (selectedDate < today) {
                    await sendWhatsAppMessage(from, createTextMessage('❌ Cannot book past dates. Please select today or a future date.'));
                    return NextResponse.json({ success: true });
                }

                await sendWhatsAppMessage(from, createTextMessage(
                    `📅 Date: *${text}*\n\nWhat time works for you?\n• Reply with your preferred time\n• Examples: 10:30, 2pm, 14:00, 9.30am`
                ));

                await supabase
                    .from('bot_sessions')
                    .update({
                        status: 'SELECT_TIME',
                        temp_data: { ...session.temp_data, date: text }
                    })
                    .eq('phone_number', from);
            }

            // 6. Handle Time Input → Show Available Slots
            else if (session.status === 'SELECT_TIME' && text) {
                // Parse flexible time input
                const parseTime = (input: string): string | null => {
                    const cleaned = input.toLowerCase().replace(/\s/g, '');

                    // Match patterns: 10:30, 10.30, 10:30am, 2pm, 14:00
                    let hours = 0, minutes = 0;

                    const match24 = cleaned.match(/^(\d{1,2})[:\.]?(\d{2})?$/);
                    const matchAmPm = cleaned.match(/^(\d{1,2})[:\.]?(\d{2})?(am|pm)$/);

                    if (matchAmPm) {
                        hours = parseInt(matchAmPm[1]);
                        minutes = matchAmPm[2] ? parseInt(matchAmPm[2]) : 0;
                        if (matchAmPm[3] === 'pm' && hours !== 12) hours += 12;
                        if (matchAmPm[3] === 'am' && hours === 12) hours = 0;
                    } else if (match24) {
                        hours = parseInt(match24[1]);
                        minutes = match24[2] ? parseInt(match24[2]) : 0;
                    } else {
                        return null;
                    }

                    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                };

                const userTime = parseTime(text);
                if (!userTime) {
                    await sendWhatsAppMessage(from, createTextMessage('❌ Could not understand time. Please try: 10:30, 2pm, or 14:00'));
                    return NextResponse.json({ success: true });
                }

                const date = session.temp_data.date;
                const serviceId = session.temp_data.service_id;

                // Get service duration
                const { data: service } = await supabase
                    .from('services')
                    .select('duration')
                    .eq('id', serviceId)
                    .single();

                const duration = service?.duration || 60;

                // Fetch available slots from consolidated availability API
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.salonflow.space';
                const availRes = await fetch(`${baseUrl}/api/public/consolidated-availability?date=${date}&service_id=${serviceId}&duration=${duration}`);
                const availData = await availRes.json();

                const allSlots: string[] = availData.slots || [];

                // Find slots near the user's preferred time
                const userMinutes = parseInt(userTime.split(':')[0]) * 60 + parseInt(userTime.split(':')[1]);

                const slotsWithDiff = allSlots.map((slot: string) => {
                    const [h, m] = slot.split(':').map(Number);
                    const slotMinutes = h * 60 + m;
                    return { slot, diff: Math.abs(slotMinutes - userMinutes) };
                });

                // Sort by proximity to user's time and take nearest 5
                slotsWithDiff.sort((a, b) => a.diff - b.diff);
                const nearestSlots = slotsWithDiff.slice(0, 5).map(s => s.slot);

                if (nearestSlots.length === 0) {
                    await sendWhatsAppMessage(from, createTextMessage(
                        `😔 No available slots on ${date}.\n\nPlease try a different date. Type "menu" to start over.`
                    ));
                    return NextResponse.json({ success: true });
                }

                // Check if exact time is available
                const exactMatch = allSlots.includes(userTime);
                let message = '';
                if (exactMatch) {
                    message = `✅ *${userTime}* is available!\n\n`;
                } else {
                    message = `⚠️ *${userTime}* is not available.\n\nHere are the nearest available slots:\n\n`;
                }

                const rows = nearestSlots.map((slot: string) => ({
                    id: `SLOT_${slot}`,
                    title: slot,
                    description: exactMatch && slot === userTime ? '✓ Your preferred time' : ''
                }));

                await sendWhatsAppMessage(from, createListMessage(
                    'Select Time Slot',
                    message + 'Choose a time:',
                    'Time Slots',
                    [{ title: 'Available Slots', rows: rows }]
                ));

                await supabase
                    .from('bot_sessions')
                    .update({
                        status: 'SELECT_SLOT',
                        temp_data: { ...session.temp_data, preferred_time: userTime }
                    })
                    .eq('phone_number', from);
            }

            // 7. Handle Slot Selection → Ask Stylist Preference
            else if (session.status === 'SELECT_SLOT' && interactive?.list_reply) {
                const slotId = interactive.list_reply.id;
                const selectedTime = slotId.replace('SLOT_', '');

                await sendWhatsAppMessage(from, createListMessage(
                    'Stylist Preference',
                    `⏰ Time: *${selectedTime}*\n\nDo you have a preferred stylist?`,
                    'Choose',
                    [{
                        title: 'Options',
                        rows: [
                            { id: 'STYLIST_NO_PREF', title: 'No Preference', description: 'Any available stylist' },
                            { id: 'STYLIST_SELECT', title: 'Choose Stylist', description: 'See available stylists' }
                        ]
                    }]
                ));

                await supabase
                    .from('bot_sessions')
                    .update({
                        status: 'SELECT_STYLIST_PREF',
                        temp_data: { ...session.temp_data, time: selectedTime }
                    })
                    .eq('phone_number', from);
            }

            // 8. Handle Stylist Preference
            else if (session.status === 'SELECT_STYLIST_PREF' && interactive?.list_reply) {
                const prefId = interactive.list_reply.id;
                const { date, time, service_id, service_name } = session.temp_data;

                if (prefId === 'STYLIST_NO_PREF') {
                    // Confirm booking with no preference
                    await sendWhatsAppMessage(from, createTextMessage(
                        `📋 *Booking Summary*\n\n` +
                        `📅 Date: ${date}\n` +
                        `⏰ Time: ${time}\n` +
                        `💇 Service: ${service_name}\n` +
                        `👤 Stylist: Any Available\n\n` +
                        `Reply *CONFIRM* to book or *CANCEL* to start over.`
                    ));

                    await supabase
                        .from('bot_sessions')
                        .update({
                            status: 'CONFIRM_BOOKING',
                            temp_data: { ...session.temp_data, stylist_id: 'NO_PREFERENCE' }
                        })
                        .eq('phone_number', from);

                } else if (prefId === 'STYLIST_SELECT') {
                    // Fetch available stylists for this slot
                    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.salonflow.space';
                    const stylistRes = await fetch(`${baseUrl}/api/public/available-stylists?date=${date}&time=${time}&service_id=${service_id}`);
                    const stylistData = await stylistRes.json();

                    const stylists = stylistData.stylists || [];

                    if (stylists.length === 0) {
                        await sendWhatsAppMessage(from, createTextMessage(
                            'No specific stylists available for this slot. We will assign the best available stylist.\n\nReply *CONFIRM* to book or *CANCEL* to start over.'
                        ));
                        await supabase
                            .from('bot_sessions')
                            .update({
                                status: 'CONFIRM_BOOKING',
                                temp_data: { ...session.temp_data, stylist_id: 'NO_PREFERENCE' }
                            })
                            .eq('phone_number', from);
                    } else {
                        const rows = stylists.slice(0, 10).map((s: any) => ({
                            id: `STY_${s.id}`,
                            title: s.name.substring(0, 24)
                        }));

                        await sendWhatsAppMessage(from, createListMessage(
                            'Select Stylist',
                            'Available stylists for your time:',
                            'Stylists',
                            [{ title: 'Stylists', rows: rows }]
                        ));

                        await supabase
                            .from('bot_sessions')
                            .update({ status: 'SELECT_STYLIST' })
                            .eq('phone_number', from);
                    }
                }
            }

            // 9. Handle Stylist Selection
            else if (session.status === 'SELECT_STYLIST' && interactive?.list_reply) {
                const stylistId = interactive.list_reply.id.replace('STY_', '');
                const stylistName = interactive.list_reply.title;
                const { date, time, service_name } = session.temp_data;

                await sendWhatsAppMessage(from, createTextMessage(
                    `📋 *Booking Summary*\n\n` +
                    `📅 Date: ${date}\n` +
                    `⏰ Time: ${time}\n` +
                    `💇 Service: ${service_name}\n` +
                    `👤 Stylist: ${stylistName}\n\n` +
                    `Reply *CONFIRM* to book or *CANCEL* to start over.`
                ));

                await supabase
                    .from('bot_sessions')
                    .update({
                        status: 'CONFIRM_BOOKING',
                        temp_data: { ...session.temp_data, stylist_id: stylistId, stylist_name: stylistName }
                    })
                    .eq('phone_number', from);
            }

            // 10. Handle Booking Confirmation
            else if (session.status === 'CONFIRM_BOOKING' && text) {
                const action = text.toLowerCase().trim();

                if (action === 'confirm') {
                    const { date, time, service_id, stylist_id } = session.temp_data;

                    // Call booking API
                    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.salonflow.space';
                    const bookRes = await fetch(`${baseUrl}/api/public/book`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            customer_phone: from,
                            customer_name: 'WhatsApp Customer',
                            service_ids: [service_id],
                            stylist_id: stylist_id,
                            date: date,
                            time: time
                        })
                    });

                    const bookData = await bookRes.json();

                    if (bookData.success) {
                        await sendWhatsAppMessage(from, createTextMessage(
                            `🎉 *Booking Confirmed!*\n\n` +
                            `Your appointment has been scheduled.\n` +
                            `📅 ${date} at ${time}\n\n` +
                            `We look forward to seeing you!\n\n` +
                            `Type "Hi" for a new booking or "Check My Booking" to view appointments.`
                        ));
                    } else {
                        await sendWhatsAppMessage(from, createTextMessage(
                            `❌ Booking failed: ${bookData.error || 'Unknown error'}\n\nPlease try again. Type "menu" to start over.`
                        ));
                    }

                    // Reset session
                    await supabase
                        .from('bot_sessions')
                        .update({ status: 'MENU', temp_data: {} })
                        .eq('phone_number', from);

                } else if (action === 'cancel') {
                    await sendWhatsAppMessage(from, createTextMessage('Booking cancelled. Type "Hi" to start again.'));
                    await supabase
                        .from('bot_sessions')
                        .update({ status: 'MENU', temp_data: {} })
                        .eq('phone_number', from);
                } else {
                    await sendWhatsAppMessage(from, createTextMessage('Please reply *CONFIRM* or *CANCEL*.'));
                }
            }

        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

