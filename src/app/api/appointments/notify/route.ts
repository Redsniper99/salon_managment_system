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
 *   appointmentId?: string,       // For single appointment
 *   appointmentIds?: string[],    // For batch (multi-service bookings)
 *   oldTime?: string,  // For reschedule
 *   oldDate?: string   // For reschedule
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, appointmentId, appointmentIds, oldTime, oldDate } = body;

        // Support both single and batch
        const idsToProcess = appointmentIds || (appointmentId ? [appointmentId] : []);

        if (!type || idsToProcess.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Missing type or appointmentId(s)' },
                { status: 400 }
            );
        }


        // Get all appointment details
        const { data: appointments, error: aptError } = await supabase
            .from('appointments')
            .select(`
                *,
                customer:customers(*),
                stylist:staff(*)
            `)
            .in('id', idsToProcess);

        if (aptError || !appointments || appointments.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Appointments not found' },
                { status: 404 }
            );
        }

        // Collect unique service IDs for all appointments
        const allServiceIds = new Set<string>();
        appointments.forEach(apt => {
            if (apt.services && apt.services.length > 0) {
                apt.services.forEach((id: string) => allServiceIds.add(id));
            }
        });

        // Fetch all services in one query
        const { data: servicesData } = await supabase
            .from('services')
            .select('id, name')
            .in('id', Array.from(allServiceIds));

        const servicesMap = new Map(servicesData?.map((s: any) => [s.id, s.name]) || []);

        // Assume all appointments are for the same customer (multi-service booking)
        const customer = appointments[0].customer as any;

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
        const results: any = { customer: null, stylists: [], managers: [] };

        if (type === 'new') {
            // Consolidate appointment details for customer
            const appointmentsList = appointments.map(apt => {
                const stylist = apt.stylist as any;
                const serviceNames = apt.services
                    ?.map((id: string) => servicesMap.get(id))
                    .filter(Boolean)
                    .join(', ') || 'Service';

                return `${serviceNames} at ${apt.start_time} with ${stylist?.name || 'stylist'}`;
            });

            const shortDate = new Date(appointments[0].appointment_date).toLocaleDateString();

            // Send ONE consolidated SMS to customer
            if (customer?.phone) {
                const msg = appointments.length === 1
                    ? `✅ Appointment Confirmed! ${appointmentsList[0]} on ${shortDate}. See you soon! - SalonFlow`
                    : `✅ ${appointments.length} Appointments Confirmed for ${shortDate}:\n${appointmentsList.map((apt, i) => `${i + 1}. ${apt}`).join('\n')}\nSee you soon! - SalonFlow`;

                const result = await textlk.sendSMS(customer.phone, msg);
                results.customer = result;
                console.log(`✅ Consolidated SMS sent to customer (${appointments.length} appointments)`);
            }

            // Group appointments by stylist and send ONE SMS per stylist
            const appointmentsByStylist = new Map<string, any[]>();
            appointments.forEach(apt => {
                const stylist = apt.stylist as any;
                if (stylist?.id) {
                    if (!appointmentsByStylist.has(stylist.id)) {
                        appointmentsByStylist.set(stylist.id, []);
                    }
                    appointmentsByStylist.get(stylist.id)!.push(apt);
                }
            });

            // Send consolidated SMS to each stylist
            for (const [stylistId, stylistAppts] of appointmentsByStylist) {
                const stylist = stylistAppts[0].stylist as any;
                if (stylist?.phone) {
                    const aptDetails = stylistAppts.map((apt: any) => {
                        const serviceNames = apt.services
                            ?.map((id: string) => servicesMap.get(id))
                            .filter(Boolean)
                            .join(', ') || 'Service';
                        return `${serviceNames} at ${apt.start_time} (${apt.duration} mins)`;
                    });

                    const msg = stylistAppts.length === 1
                        ? `📅 New Appointment! Customer: ${customer?.name || 'Customer'}, ${aptDetails[0]} on ${shortDate}.`
                        : `📅 ${stylistAppts.length} New Appointments with ${customer?.name || 'Customer'} on ${shortDate}:\n${aptDetails.map((d: any, i: number) => `${i + 1}. ${d}`).join('\n')}`;

                    const result = await textlk.sendSMS(stylist.phone, msg);
                    results.stylists.push({ name: stylist.name, result });
                    console.log(`✅ Consolidated SMS sent to stylist ${stylist.name} (${stylistAppts.length} appointments)`);
                }
            }

            // Send ONE consolidated SMS to managers
            const { data: managers } = await supabase
                .from('staff')
                .select('id, name, phone')
                .eq('role', 'Manager')
                .eq('is_active', true);

            if (managers && managers.length > 0) {
                const aptSummary = appointments.map(apt => {
                    const stylist = apt.stylist as any;
                    const serviceNames = apt.services
                        ?.map((id: string) => servicesMap.get(id))
                        .filter(Boolean)
                        .join(', ') || 'Service';
                    return `${serviceNames} at ${apt.start_time} with ${stylist?.name}`;
                });

                const managerMsg = appointments.length === 1
                    ? `📅 New Booking! ${customer?.name || 'Customer'} booked ${aptSummary[0]} on ${shortDate}. - SalonFlow`
                    : `📅 ${appointments.length} New Bookings! ${customer?.name || 'Customer'} on ${shortDate}:\n${aptSummary.map((s, i) => `${i + 1}. ${s}`).join('\n')} - SalonFlow`;

                for (const manager of managers) {
                    if (manager.phone) {
                        const result = await textlk.sendSMS(manager.phone, managerMsg);
                        results.managers.push({ name: manager.name, result });
                        console.log(`✅ Consolidated SMS sent to manager: ${manager.name}`);
                    }
                }
            }

        } else if (type === 'reschedule') {
            // Reschedule only works for single appointment currently
            const appointment = appointments[0];
            const stylist = appointment.stylist as any;
            const serviceNames = appointment.services
                ?.map((id: string) => servicesMap.get(id))
                .filter(Boolean)
                .join(', ') || 'Services';
            const shortDate = new Date(appointment.appointment_date).toLocaleDateString();

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
                results.stylists.push({ name: stylist.name, result });
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
