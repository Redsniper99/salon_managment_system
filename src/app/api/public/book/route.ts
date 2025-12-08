import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

        // Verify stylist exists and can perform this service
        const { data: stylist, error: stylistError } = await supabase
            .from('staff')
            .select('id, name, branch_id, specializations')
            .eq('id', appointment.stylist_id)
            .eq('is_active', true)
            .single();

        if (stylistError || !stylist) {
            return NextResponse.json(
                { success: false, error: 'Stylist not found' },
                { status: 404 }
            );
        }

        // Check if stylist can perform this service
        if (!stylist.specializations?.includes(appointment.service_id)) {
            return NextResponse.json(
                { success: false, error: 'This stylist does not offer the selected service' },
                { status: 400 }
            );
        }

        // Check for existing appointment at this time
        const { data: existingAppointments } = await supabase
            .from('appointments')
            .select('id, time, services(duration)')
            .eq('stylist_id', appointment.stylist_id)
            .eq('date', appointment.date)
            .neq('status', 'Cancelled');

        // Check for time conflicts
        const [newHour, newMinute] = appointment.time.split(':').map(Number);
        const newStart = newHour * 60 + newMinute;
        const newEnd = newStart + service.duration;

        for (const existing of existingAppointments || []) {
            const [existH, existM] = existing.time.split(':').map(Number);
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
                stylist_id: appointment.stylist_id,
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
