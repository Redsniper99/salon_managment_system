import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createTextLkService } from '@/services/textlk';

// Use Service Role Key for reliable server-side operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/appointments/notify
 * 
 * Server-side endpoint to send appointment notifications.
 * This is more reliable than client-side notifications.
 * 
 * Request body:
 * {
 *   type: 'new' | 'reschedule' | 'cancel',
 *   appointmentId: string,
 *   oldTime?: string,  // For reschedule
 *   oldDate?: string   // For reschedule
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, appointmentId, oldTime, oldDate } = body;

        if (!type || !appointmentId) {
            return NextResponse.json(
                { success: false, error: 'Missing type or appointmentId' },
                { status: 400 }
            );
        }

        // Get appointment details
        const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select(`
                *,
                customer:customers(*),
                stylist:staff(*)
            `)
            .eq('id', appointmentId)
            .single();

        if (aptError || !appointment) {
            return NextResponse.json(
                { success: false, error: 'Appointment not found' },
                { status: 404 }
            );
        }

        const customer = appointment.customer as any;
        const stylist = appointment.stylist as any;

        // Get service names
        let serviceNames = 'Services';
        if (appointment.services && appointment.services.length > 0) {
            const { data: services } = await supabase
                .from('services')
                .select('name')
                .in('id', appointment.services);
            if (services && services.length > 0) {
                serviceNames = services.map(s => s.name).join(', ');
            }
        }

        const shortDate = new Date(appointment.appointment_date).toLocaleDateString();
        const fullDate = new Date(appointment.appointment_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Initialize SMS service
        const apiKey = process.env.TEXT_LK_API_KEY;
        const senderId = process.env.TEXT_LK_SENDER_ID;

        if (!apiKey || !senderId) {
            console.error('❌ SMS config missing: TEXT_LK_API_KEY or TEXT_LK_SENDER_ID');
            return NextResponse.json(
                { success: false, error: 'SMS service not configured' },
                { status: 500 }
            );
        }

        const textlk = createTextLkService(apiKey, senderId);
        const results: any = { customer: null, stylist: null, managers: [] };

        if (type === 'new') {
            // New appointment notifications

            // Customer SMS
            if (customer?.phone) {
                const msg = `✅ Appointment Confirmed! ${serviceNames} on ${shortDate} at ${appointment.start_time} with ${stylist?.name || 'our stylist'}. See you soon! - SalonFlow`;
                const result = await textlk.sendSMS(customer.phone, msg);
                results.customer = result;
                console.log('✅ New appointment SMS sent to customer:', customer.phone);
            }

            // Stylist SMS
            if (stylist?.phone) {
                const msg = `📅 New Appointment! Customer: ${customer?.name || 'Customer'}, Service: ${serviceNames}, Date: ${shortDate} at ${appointment.start_time}. Duration: ${appointment.duration} mins.`;
                const result = await textlk.sendSMS(stylist.phone, msg);
                results.stylist = result;
                console.log('✅ New appointment SMS sent to stylist:', stylist.phone);
            }

            // Manager SMS
            const { data: managers } = await supabase
                .from('staff')
                .select('id, name, phone')
                .eq('role', 'Manager')
                .eq('is_active', true);

            if (managers && managers.length > 0) {
                const managerMsg = `📅 New Booking! ${customer?.name || 'Customer'} booked ${serviceNames} on ${shortDate} at ${appointment.start_time} with ${stylist?.name || 'stylist'}. - SalonFlow`;

                for (const manager of managers) {
                    if (manager.phone) {
                        const result = await textlk.sendSMS(manager.phone, managerMsg);
                        results.managers.push({ name: manager.name, result });
                        console.log('✅ New appointment SMS sent to manager:', manager.name);
                    }
                }
            }

        } else if (type === 'reschedule') {
            // Reschedule notifications
            const oldDateStr = oldDate ? new Date(oldDate).toLocaleDateString() : 'previous date';
            const oldTimeStr = oldTime || 'previous time';

            // Customer SMS
            if (customer?.phone) {
                const msg = `🔄 Appointment Rescheduled! Your ${serviceNames} appointment has been moved to ${shortDate} at ${appointment.start_time}. See you then! - SalonFlow`;
                const result = await textlk.sendSMS(customer.phone, msg);
                results.customer = result;
                console.log('✅ Reschedule SMS sent to customer:', customer.phone);
            }

            // Stylist SMS  
            if (stylist?.phone) {
                const msg = `🔄 Appointment Updated! ${customer?.name || 'Customer'}'s ${serviceNames} rescheduled to ${shortDate} at ${appointment.start_time}. Duration: ${appointment.duration} mins.`;
                const result = await textlk.sendSMS(stylist.phone, msg);
                results.stylist = result;
                console.log('✅ Reschedule SMS sent to stylist:', stylist.phone);
            }

            // Manager SMS
            const { data: managers } = await supabase
                .from('staff')
                .select('id, name, phone')
                .eq('role', 'Manager')
                .eq('is_active', true);

            if (managers && managers.length > 0) {
                const managerMsg = `🔄 Appointment Rescheduled! ${customer?.name || 'Customer'}'s ${serviceNames} moved from ${oldDateStr} ${oldTimeStr} to ${shortDate} ${appointment.start_time}. - SalonFlow`;

                for (const manager of managers) {
                    if (manager.phone) {
                        const result = await textlk.sendSMS(manager.phone, managerMsg);
                        results.managers.push({ name: manager.name, result });
                        console.log('✅ Reschedule SMS sent to manager:', manager.name);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Notifications sent',
            results
        });

    } catch (error: any) {
        console.error('Notification API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
