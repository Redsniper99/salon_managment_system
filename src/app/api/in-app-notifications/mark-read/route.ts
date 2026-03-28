import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getBearerToken(request: NextRequest) {
    const header = request.headers.get('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match?.[1] || null;
}

async function getStaffIdFromRequest(request: NextRequest) {
    const token = getBearerToken(request);
    if (!token) return null;

    const supabaseAuthed = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error } = await supabaseAuthed.auth.getUser();
    if (error || !user) return null;

    const supabaseAdmin = createClient(supabaseUrl, adminKey, {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: staff, error: staffError } = await supabaseAdmin
        .from('staff')
        .select('id')
        .eq('profile_id', user.id)
        .single();

    if (staffError || !staff) return null;
    return staff.id as string;
}

export async function POST(request: NextRequest) {
    try {
        const staffId = await getStaffIdFromRequest(request);
        if (!staffId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { notificationId, markAll } = body || {};

        const supabaseAdmin = createClient(supabaseUrl, adminKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });

        if (markAll) {
            const { error } = await supabaseAdmin
                .from('in_app_notification_recipients')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('staff_id', staffId)
                .eq('is_read', false);

            if (error) {
                return NextResponse.json({ success: false, error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, updated: true });
        }

        if (!notificationId) {
            return NextResponse.json(
                { success: false, error: 'notificationId is required (or set markAll=true)' },
                { status: 400 }
            );
        }

        const { error: updateError } = await supabaseAdmin
            .from('in_app_notification_recipients')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('staff_id', staffId)
            .eq('notification_id', notificationId)
            .eq('is_read', false);

        if (updateError) {
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, updated: true });
    } catch (error: any) {
        console.error('mark-read error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

