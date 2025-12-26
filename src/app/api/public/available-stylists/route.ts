import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use Service Role Key to bypass RLS and read appointments
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TimeSlot {
    time: string;
    available: boolean;
    reason?: string;
}

/**
 * GET /api/public/available-stylists
 * 
 * Returns all available stylists for a service with their time slots.
 * This is an all-in-one endpoint for the "no preference" booking flow.
 * 
 * Query params:
 * - service_id: (required) The service to book
 * - date: (required) The date to check (YYYY-MM-DD format)
 * - branch_id: (optional) Filter by branch
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const serviceId = searchParams.get('service_id');
        const date = searchParams.get('date');
        const branchId = searchParams.get('branch_id');

        if (!serviceId || !date) {
            return NextResponse.json(
                { success: false, error: 'service_id and date are required' },
                { status: 400 }
            );
        }

        // Validate date
        const requestedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (requestedDate < today) {
            return NextResponse.json(
                { success: false, error: 'Cannot check availability for past dates' },
                { status: 400 }
            );
        }

        // Get service details
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('id, name, duration, price, category')
            .eq('id', serviceId)
            .eq('is_active', true)
            .single();

        if (serviceError || !service) {
            return NextResponse.json(
                { success: false, error: 'Service not found' },
                { status: 404 }
            );
        }

        const serviceDuration = service.duration;
        const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });

        // Get stylists who can perform this service
        let stylistQuery = supabase
            .from('staff')
            .select('id, name, working_days, working_hours, specializations, is_emergency_unavailable')
            .eq('role', 'Stylist')
            .eq('is_active', true)
            .eq('is_emergency_unavailable', false)
            .contains('specializations', [serviceId]);

        if (branchId) {
            stylistQuery = stylistQuery.eq('branch_id', branchId);
        }

        const { data: stylists, error: stylistError } = await stylistQuery;

        if (stylistError) {
            console.error('Error fetching stylists:', stylistError);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch stylists' },
                { status: 500 }
            );
        }

        if (!stylists || stylists.length === 0) {
            return NextResponse.json({
                success: true,
                data: [],
                service: service,
                message: 'No stylists available for this service'
            });
        }

        // Get unavailability records for all stylists
        const stylistIds = stylists.map(s => s.id);
        const { data: unavailability } = await supabase
            .from('stylist_unavailability')
            .select('stylist_id')
            .in('stylist_id', stylistIds)
            .eq('unavailable_date', date);

        const unavailableIds = new Set(unavailability?.map(u => u.stylist_id) || []);

        // Get salon settings
        const { data: settings } = await supabase
            .from('salon_settings')
            .select('slot_interval')
            .single();

        const slotInterval = settings?.slot_interval || 30;

        // Get all breaks for these stylists
        const { data: allBreaks } = await supabase
            .from('stylist_breaks')
            .select('*')
            .in('stylist_id', stylistIds);

        // Get all appointments for these stylists on this date
        const { data: allAppointments } = await supabase
            .from('appointments')
            .select('stylist_id, start_time')
            .in('stylist_id', stylistIds)
            .eq('appointment_date', date)
            .neq('status', 'Cancelled')
            .neq('status', 'NoShow')
            .neq('status', 'Completed');

        // Get all service names for skill display
        const { data: allServices } = await supabase
            .from('services')
            .select('id, name, category')
            .eq('is_active', true);

        const serviceMap = new Map(allServices?.map(s => [s.id, s]) || []);

        // Process each stylist
        const results: any[] = [];

        for (const stylist of stylists) {
            // Skip unavailable stylists
            if (unavailableIds.has(stylist.id)) continue;

            // Skip if not working on this day
            if (stylist.working_days && !stylist.working_days.includes(dayOfWeek)) continue;

            // Get breaks for this stylist
            const breaks = allBreaks?.filter(b => b.stylist_id === stylist.id) || [];

            // Get appointments for this stylist
            const appointments = allAppointments?.filter(a => a.stylist_id === stylist.id) || [];

            // Generate time slots
            // Working hours can be either flat {start, end} or by day {Monday: {start, end}, ...}
            let dayHours = stylist.working_hours;
            if (dayHours && dayHours[dayOfWeek]) {
                dayHours = dayHours[dayOfWeek];
            }
            const workingHours = dayHours || { start: '09:00', end: '18:00' };
            const slots: TimeSlot[] = [];

            const startStr = workingHours.start || '09:00';
            const endStr = workingHours.end || '18:00';
            const [startHour, startMinute] = startStr.split(':').map(Number);
            const [endHour, endMinute] = endStr.split(':').map(Number);

            const startTime = startHour * 60 + startMinute;
            const endTime = endHour * 60 + endMinute;

            // For today, skip past slots
            let currentTime = startTime;
            if (date === new Date().toISOString().split('T')[0]) {
                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes() + 30;
                currentTime = Math.max(startTime, Math.ceil(currentMinutes / slotInterval) * slotInterval);
            }

            while (currentTime + serviceDuration <= endTime) {
                const hours = Math.floor(currentTime / 60);
                const minutes = currentTime % 60;
                const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

                const slotEnd = currentTime + serviceDuration;

                // Check breaks
                let isBreak = false;
                for (const brk of breaks) {
                    const [bStartH, bStartM] = brk.start_time.split(':').map(Number);
                    const [bEndH, bEndM] = brk.end_time.split(':').map(Number);
                    const breakStart = bStartH * 60 + bStartM;
                    const breakEnd = bEndH * 60 + bEndM;

                    if (currentTime < breakEnd && slotEnd > breakStart) {
                        isBreak = true;
                        break;
                    }
                }

                // Check appointments
                let isBooked = false;
                if (!isBreak) {
                    for (const apt of appointments) {
                        const [aptH, aptM] = apt.start_time.split(':').map(Number);
                        const aptStart = aptH * 60 + aptM;
                        const aptDuration = 60; // Default duration since we removed join
                        const aptEnd = aptStart + aptDuration;

                        if (currentTime < aptEnd && slotEnd > aptStart) {
                            isBooked = true;
                            break;
                        }
                    }
                }

                slots.push({
                    time: timeString,
                    available: !isBreak && !isBooked,
                    reason: isBreak ? 'Break time' : isBooked ? 'Already booked' : undefined
                });

                currentTime += slotInterval;
            }

            // Only include stylists with at least one available slot
            const availableSlots = slots.filter(s => s.available).length;
            if (availableSlots > 0) {
                results.push({
                    stylist: {
                        id: stylist.id,
                        name: stylist.name,
                        workingHours: workingHours
                    },
                    skills: (stylist.specializations || [])
                        .map((id: string) => serviceMap.get(id))
                        .filter(Boolean)
                        .map((s: any) => ({ id: s.id, name: s.name, category: s.category })),
                    slots: slots,
                    availableCount: availableSlots
                });
            }
        }

        // Sort by most available slots first
        results.sort((a, b) => b.availableCount - a.availableCount);

        return NextResponse.json({
            success: true,
            service: service,
            date: date,
            dayOfWeek: dayOfWeek,
            data: results,
            totalStylists: results.length
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
