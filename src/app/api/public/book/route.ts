import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRateLimitKey, checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

// Use Service Role Key to bypass RLS for booking operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/public/book
 * 
 * Creates a new appointment booking.
 * 
 * Request body:
 * {
 *   customer: {
 *     name: string (required)
 *     phone: string (required)
 *     email?: string
 *     gender?: "Male" | "Female" | "Other"
 *   },
 *   appointment: {
 *     service_id: string (required)
 *     stylist_id: string (required)
 *     date: string (required, YYYY-MM-DD)
 *     time: string (required, HH:MM)
 *     notes?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // Rate limiting (20 bookings per minute per IP)
        const rateLimitKey = getRateLimitKey(request);
        const { allowed, resetIn } = checkRateLimit(rateLimitKey, 20);
        if (!allowed) {
            return rateLimitResponse(resetIn);
        }

        const body = await request.json();
        const { customer, appointment } = body;

        // Validate required fields
        if (!customer?.name || !customer?.phone) {
            return NextResponse.json(
                { success: false, error: 'Customer name and phone are required' },
                { status: 400 }
            );
        }

        if (!appointment?.service_id || !appointment?.stylist_id || !appointment?.date || !appointment?.time) {
            return NextResponse.json(
                { success: false, error: 'Service, stylist, date, and time are required' },
                { status: 400 }
            );
        }

        // Validate date is not in the past
        const appointmentDate = new Date(appointment.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (appointmentDate < today) {
            return NextResponse.json(
                { success: false, error: 'Cannot book appointments in the past' },
                { status: 400 }
            );
        }

        // Verify service exists
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('id, name, duration, price')
            .eq('id', appointment.service_id)
            .eq('is_active', true)
            .single();

        if (serviceError || !service) {
            return NextResponse.json(
                { success: false, error: 'Service not found' },
                { status: 404 }
            );
        }

        // Track if this is a NO_PREFERENCE booking
        const isNoPreference = appointment.stylist_id === 'NO_PREFERENCE';
        let selectedStylistId = appointment.stylist_id;
        let stylist: any = null;

        if (isNoPreference) {
            // ============================================
            // NO_PREFERENCE DISPATCHER LOGIC
            // Find all qualified stylists available at the requested time
            // and select the one with the fewest appointments (load balancing)
            // ============================================

            const dayOfWeek = new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long' });

            // Get all stylists who can perform this service
            const { data: qualifiedStylists, error: qualifiedError } = await supabase
                .from('staff')
                .select('id, name, branch_id, specializations, working_days, working_hours, is_emergency_unavailable')
                .eq('role', 'Stylist')
                .eq('is_active', true)
                .eq('is_emergency_unavailable', false)
                .contains('specializations', [appointment.service_id]);

            if (qualifiedError || !qualifiedStylists || qualifiedStylists.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'No stylists available for this service' },
                    { status: 404 }
                );
            }

            // Filter stylists working on this day
            const stylistsWorkingToday = qualifiedStylists.filter(s =>
                !s.working_days || s.working_days.includes(dayOfWeek)
            );

            if (stylistsWorkingToday.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'No stylists available on this day' },
                    { status: 404 }
                );
            }

            // Check for unavailability (leave/holiday)
            const stylistIds = stylistsWorkingToday.map(s => s.id);
            const { data: unavailability } = await supabase
                .from('stylist_unavailability')
                .select('stylist_id')
                .in('stylist_id', stylistIds)
                .lte('start_date', appointment.date)
                .gte('end_date', appointment.date);

            const unavailableIds = new Set(unavailability?.map(u => u.stylist_id) || []);
            const availableStylists = stylistsWorkingToday.filter(s => !unavailableIds.has(s.id));

            if (availableStylists.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'All stylists are unavailable on this date' },
                    { status: 404 }
                );
            }

            // Get all breaks for available stylists
            const availableStylistIds = availableStylists.map(s => s.id);
            const { data: allBreaks } = await supabase
                .from('stylist_breaks')
                .select('*')
                .in('stylist_id', availableStylistIds);

            // Get all appointments for these stylists on this date
            const { data: allAppointments } = await supabase
                .from('appointments')
                .select('stylist_id, start_time, services(duration)')
                .in('stylist_id', availableStylistIds)
                .eq('appointment_date', appointment.date)
                .neq('status', 'Cancelled');

            // Calculate requested slot timing
            const [reqHour, reqMinute] = appointment.time.split(':').map(Number);
            const reqStart = reqHour * 60 + reqMinute;
            const reqEnd = reqStart + service.duration;

            // Find stylists who are free at the requested time
            const freeStylists: { stylist: any; appointmentCount: number }[] = [];

            for (const s of availableStylists) {
                const workingHours = s.working_hours || { start: '09:00', end: '18:00' };
                const [startH, startM] = workingHours.start.split(':').map(Number);
                const [endH, endM] = workingHours.end.split(':').map(Number);
                const stylistStart = startH * 60 + startM;
                const stylistEnd = endH * 60 + endM;

                // Check if slot is within working hours
                if (reqStart < stylistStart || reqEnd > stylistEnd) continue;

                // Check breaks
                const breaks = allBreaks?.filter(b => b.stylist_id === s.id) || [];
                let isBreak = false;
                for (const brk of breaks) {
                    const [bStartH, bStartM] = brk.start_time.split(':').map(Number);
                    const [bEndH, bEndM] = brk.end_time.split(':').map(Number);
                    const breakStart = bStartH * 60 + bStartM;
                    const breakEnd = bEndH * 60 + bEndM;
                    if (reqStart < breakEnd && reqEnd > breakStart) {
                        isBreak = true;
                        break;
                    }
                }
                if (isBreak) continue;

                // Check appointments
                const appointments = allAppointments?.filter(a => a.stylist_id === s.id) || [];
                let isBooked = false;
                for (const apt of appointments) {
                    const [aptH, aptM] = apt.start_time.split(':').map(Number);
                    const aptStart = aptH * 60 + aptM;
                    const aptDuration = (apt.services as any)?.duration || 60;
                    const aptEnd = aptStart + aptDuration;
                    if (reqStart < aptEnd && reqEnd > aptStart) {
                        isBooked = true;
                        break;
                    }
                }
                if (isBooked) continue;

                // Stylist is available! Count their appointments for load balancing
                freeStylists.push({
                    stylist: s,
                    appointmentCount: appointments.length
                });
            }

            if (freeStylists.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'No stylists available at this time' },
                    { status: 409 }
                );
            }

            // LOAD BALANCING: Select the stylist with the fewest appointments today
            freeStylists.sort((a, b) => a.appointmentCount - b.appointmentCount);
            stylist = freeStylists[0].stylist;
            selectedStylistId = stylist.id;

        } else {
            // ============================================
            // STANDARD FLOW: Verify specific stylist
            // ============================================
            const { data: fetchedStylist, error: stylistError } = await supabase
                .from('staff')
                .select('id, name, branch_id, specializations')
                .eq('id', appointment.stylist_id)
                .eq('is_active', true)
                .single();

            if (stylistError || !fetchedStylist) {
                return NextResponse.json(
                    { success: false, error: 'Stylist not found' },
                    { status: 404 }
                );
            }

            // Check if stylist can perform this service
            if (!fetchedStylist.specializations?.includes(appointment.service_id)) {
                return NextResponse.json(
                    { success: false, error: 'This stylist does not offer the selected service' },
                    { status: 400 }
                );
            }

            stylist = fetchedStylist;
        }

        // Check for existing appointment at this time (skip for NO_PREFERENCE as we already checked)
        if (!isNoPreference) {
            const { data: existingAppointments } = await supabase
                .from('appointments')
                .select('id, start_time, services(duration)')
                .eq('stylist_id', selectedStylistId)
                .eq('appointment_date', appointment.date)
                .neq('status', 'Cancelled');

            // Check for time conflicts
            const [newHour, newMinute] = appointment.time.split(':').map(Number);
            const newStart = newHour * 60 + newMinute;
            const newEnd = newStart + service.duration;

            for (const existing of existingAppointments || []) {
                const [existH, existM] = existing.start_time.split(':').map(Number);
                const existStart = existH * 60 + existM;
                const existDuration = (existing.services as any)?.duration || 60;
                const existEnd = existStart + existDuration;

                if (newStart < existEnd && newEnd > existStart) {
                    return NextResponse.json(
                        { success: false, error: 'This time slot is no longer available' },
                        { status: 409 }
                    );
                }
            }
        }

        // Find or create customer
        let customerId: string;
        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', customer.phone)
            .single();

        if (existingCustomer) {
            customerId = existingCustomer.id;

            // Update customer details if provided
            await supabase
                .from('customers')
                .update({
                    name: customer.name,
                    email: customer.email || undefined,
                    gender: customer.gender || undefined
                })
                .eq('id', customerId);
        } else {
            // Create new customer
            const { data: newCustomer, error: customerError } = await supabase
                .from('customers')
                .insert({
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email || null,
                    gender: customer.gender || 'Other',
                    is_active: true
                })
                .select('id')
                .single();

            if (customerError) {
                console.error('Error creating customer:', customerError);
                return NextResponse.json(
                    { success: false, error: 'Failed to create customer' },
                    { status: 500 }
                );
            }

            customerId = newCustomer.id;
        }

        // Create the appointment
        const { data: newAppointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
                customer_id: customerId,
                service_id: appointment.service_id,
                stylist_id: selectedStylistId,
                branch_id: stylist.branch_id,
                date: appointment.date,
                time: appointment.time,
                status: 'Pending',
                notes: appointment.notes || null,
                payment_status: 'Unpaid'
            })
            .select('id, date, time, status')
            .single();

        if (appointmentError) {
            console.error('Error creating appointment:', appointmentError);
            return NextResponse.json(
                { success: false, error: 'Failed to create appointment' },
                { status: 500 }
            );
        }

        // ============================================
        // SEND BOOKING CONFIRMATION NOTIFICATIONS
        // ============================================
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.salonflow.space';
        const formattedDate = new Date(appointment.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Send SMS confirmation
        if (customer.phone) {
            try {
                const smsMessage = `✅ Booking Confirmed!\n\n📅 ${formattedDate}\n⏰ ${appointment.time}\n💇 ${service.name}\n👤 Stylist: ${stylist.name}\n\nThank you for choosing our salon! Reply CANCEL to cancel.`;

                await fetch(`${baseUrl}/api/send-sms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: customer.phone,
                        message: smsMessage
                    })
                });
            } catch (smsError) {
                console.error('Failed to send SMS confirmation:', smsError);
                // Don't fail the booking if SMS fails
            }
        }

        // Send Email confirmation
        if (customer.email) {
            try {
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #7c3aed;">✅ Booking Confirmed!</h2>
                        <p>Hi ${customer.name},</p>
                        <p>Your appointment has been successfully booked.</p>
                        
                        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #374151;">Appointment Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0;"><strong>📅 Date:</strong></td>
                                    <td style="padding: 8px 0;">${formattedDate}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0;"><strong>⏰ Time:</strong></td>
                                    <td style="padding: 8px 0;">${appointment.time}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0;"><strong>💇 Service:</strong></td>
                                    <td style="padding: 8px 0;">${service.name} (${service.duration} mins)</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0;"><strong>👤 Stylist:</strange></td>
                                    <td style="padding: 8px 0;">${stylist.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0;"><strong>💰 Price:</strong></td>
                                    <td style="padding: 8px 0;">Rs. ${service.price}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px;">
                            If you need to reschedule or cancel, please contact us in advance.
                        </p>
                        
                        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
                            Thank you for choosing our salon!
                        </p>
                    </div>
                `;

                await fetch(`${baseUrl}/api/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: customer.email,
                        subject: `✅ Booking Confirmed - ${formattedDate} at ${appointment.time}`,
                        html: emailHtml
                    })
                });
            } catch (emailError) {
                console.error('Failed to send email confirmation:', emailError);
                // Don't fail the booking if email fails
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Appointment booked successfully',
            data: {
                appointmentId: newAppointment.id,
                date: newAppointment.date,
                time: newAppointment.time,
                status: newAppointment.status,
                service: {
                    name: service.name,
                    duration: service.duration,
                    price: service.price
                },
                stylist: {
                    name: stylist.name
                },
                customer: {
                    name: customer.name,
                    phone: customer.phone
                },
                notifications: {
                    sms: !!customer.phone,
                    email: !!customer.email
                }
            }
        }, { status: 201 });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

