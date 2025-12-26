import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase';

// Use Service Role Key to bypass RLS and read appointments
const supabase = getAdminClient();

interface TimeSlot {
    time: string;
    available: boolean;
    availableStylistCount: number;
}

/**
 * GET /api/public/consolidated-availability
 * 
 * Returns a single merged availability grid for "No Preference" bookings.
 * A slot is available if AT LEAST ONE qualified stylist is free.
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

        // Get all appointments for these stylists on this date (bypasses RLS with service role key)
        const { data: allAppointments, error: appointmentError } = await supabase
            .from('appointments')
            .select('stylist_id, start_time')
            .in('stylist_id', stylistIds)
            .eq('appointment_date', date)
            .neq('status', 'Cancelled')
            .neq('status', 'NoShow')
            .neq('status', 'Completed');

        // Find the earliest start and latest end across all stylists
        let globalStartTime = 24 * 60; // Start with end of day
        let globalEndTime = 0; // Start with beginning of day

        const availableStylists = stylists.filter(stylist => {
            // Skip unavailable stylists
            if (unavailableIds.has(stylist.id)) return false;
            // Skip if not working on this day
            if (stylist.working_days && !stylist.working_days.includes(dayOfWeek)) return false;
            return true;
        });

        if (availableStylists.length === 0) {
            return NextResponse.json({
                success: true,
                data: [],
                service: service,
                message: 'No stylists available on this day'
            });
        }

        // Calculate global time range
        for (const stylist of availableStylists) {
            const workingHours = stylist.working_hours || { start: '09:00', end: '18:00' };
            const [startHour, startMinute] = workingHours.start.split(':').map(Number);
            const [endHour, endMinute] = workingHours.end.split(':').map(Number);
            const startTime = startHour * 60 + startMinute;
            const endTime = endHour * 60 + endMinute;

            globalStartTime = Math.min(globalStartTime, startTime);
            globalEndTime = Math.max(globalEndTime, endTime);
        }

        // For today, skip past slots
        let currentTime = globalStartTime;
        // Use local date (not UTC) to correctly filter today's past slots
        const now = new Date();
        const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (date === localToday) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes() + 30; // 30 min buffer
            currentTime = Math.max(globalStartTime, Math.ceil(currentMinutes / slotInterval) * slotInterval);
        }

        // Generate merged time slots
        const consolidatedSlots: TimeSlot[] = [];

        while (currentTime + serviceDuration <= globalEndTime) {
            const hours = Math.floor(currentTime / 60);
            const minutes = currentTime % 60;
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            const slotEnd = currentTime + serviceDuration;

            // Count how many stylists are available at this time
            let availableCount = 0;

            for (const stylist of availableStylists) {
                const workingHours = stylist.working_hours || { start: '09:00', end: '18:00' };
                const [startHour, startMinute] = workingHours.start.split(':').map(Number);
                const [endHour, endMinute] = workingHours.end.split(':').map(Number);
                const stylistStart = startHour * 60 + startMinute;
                const stylistEnd = endHour * 60 + endMinute;

                // Check if slot is within stylist's working hours
                if (currentTime < stylistStart || slotEnd > stylistEnd) {
                    continue; // Stylist not working at this time
                }

                // Check breaks for this stylist
                const breaks = allBreaks?.filter(b => b.stylist_id === stylist.id) || [];
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
                if (isBreak) continue;

                // Check appointments for this stylist
                const appointments = allAppointments?.filter(a => a.stylist_id === stylist.id) || [];
                let isBooked = false;
                for (const apt of appointments) {
                    const [aptH, aptM] = apt.start_time.split(':').map(Number);
                    const aptStart = aptH * 60 + aptM;
                    const aptDuration = 60; // Default duration since join removed
                    const aptEnd = aptStart + aptDuration;

                    if (currentTime < aptEnd && slotEnd > aptStart) {
                        isBooked = true;
                        break;
                    }
                }
                if (isBooked) continue;

                // Stylist is available!
                availableCount++;
            }

            consolidatedSlots.push({
                time: timeString,
                available: availableCount > 0,
                availableStylistCount: availableCount
            });

            currentTime += slotInterval;
        }

        return NextResponse.json({
            success: true,
            service: service,
            date: date,
            dayOfWeek: dayOfWeek,
            data: consolidatedSlots,
            totalSlots: consolidatedSlots.length,
            availableSlots: consolidatedSlots.filter(s => s.available).length,
            qualifiedStylistCount: availableStylists.length
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
