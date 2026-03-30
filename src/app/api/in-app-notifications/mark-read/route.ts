import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStaffAuthFromRequest } from '@/lib/in-app-notifications-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    try {
        const auth = await getStaffAuthFromRequest(request);
        if (!auth.ok) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (auth.staffId === null) {
            return NextResponse.json({ success: true, updated: false, skipped: 'no_staff_profile' });
        }
        const staffId = auth.staffId;

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

