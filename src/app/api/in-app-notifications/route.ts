import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStaffAuthFromRequest } from '@/lib/in-app-notifications-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
    try {
        const auth = await getStaffAuthFromRequest(request);
        if (!auth.ok) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (auth.staffId === null) {
            return NextResponse.json({ success: true, unreadCount: 0, notifications: [] });
        }
        const staffId = auth.staffId;

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get('limit') || 10), 50);

        const supabaseAdmin = createClient(supabaseUrl, adminKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });

        // Unread count
        const { count: unreadCount, error: unreadCountError } = await supabaseAdmin
            .from('in_app_notification_recipients')
            .select('id', { count: 'exact' })
            .eq('staff_id', staffId)
            .eq('is_read', false);

        if (unreadCountError) {
            return NextResponse.json(
                { success: false, error: unreadCountError.message || 'Failed to fetch unread count' },
                { status: 500 }
            );
        }

        const unread = unreadCount || 0;

        // Latest recipient rows (includes notification_id + read status)
        const { data: recipientRows, error: recipientError } = await supabaseAdmin
            .from('in_app_notification_recipients')
            .select('notification_id,is_read,read_at,created_at')
            .eq('staff_id', staffId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (recipientError) {
            return NextResponse.json(
                { success: false, error: recipientError.message || 'Failed to fetch notifications' },
                { status: 500 }
            );
        }

        const notificationIds = (recipientRows || []).map(r => r.notification_id);
        if (notificationIds.length === 0) {
            return NextResponse.json({ success: true, unreadCount: unread, notifications: [] });
        }

        // Fetch notifications and merge
        const { data: notifications, error: notifError } = await supabaseAdmin
            .from('in_app_notifications')
            .select('id,type,title,message,branch_id,appointment_id,invoice_id,created_at')
            .in('id', notificationIds);

        if (notifError) {
            return NextResponse.json(
                { success: false, error: notifError.message || 'Failed to fetch notification details' },
                { status: 500 }
            );
        }

        const notifMap = new Map((notifications || []).map(n => [n.id, n]));

        const merged = (recipientRows || [])
            .map(r => {
                const n = notifMap.get(r.notification_id);
                if (!n) return null;
                return {
                    id: n.id,
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    branchId: n.branch_id,
                    appointmentId: n.appointment_id,
                    invoiceId: n.invoice_id,
                    createdAt: n.created_at,
                    isRead: r.is_read,
                    readAt: r.read_at
                };
            })
            .filter(Boolean) as any[];

        // Keep recipient ordering (latest first)
        return NextResponse.json({
            success: true,
            unreadCount: unread,
            notifications: merged
        });
    } catch (error: any) {
        console.error('in_app_notifications GET error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

