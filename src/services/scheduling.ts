import { supabase } from '@/lib/supabase';

interface TimeSlot {
    time: string;
    available: boolean;
    reason?: string;
}

interface SalonSettings {
    slot_interval: number;
    booking_window_days: number;
    booking_buffer_minutes: number;
    default_start_time: string;
    default_end_time: string;
}

export interface StylistBreak {
    id?: string;
    stylist_id: string;
    day_of_week?: number;
    start_time: string;
    end_time: string;
    is_recurring: boolean;
    created_at?: string;
}

export const schedulingService = {
    /**
     * Get salon settings
     */
    async getSalonSettings(): Promise<SalonSettings | null> {
        try {
            const { data, error } = await supabase
                .from('salon_settings')
                .select('*')
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching salon settings:', error);
            // Return defaults if not found
            return {
                slot_interval: 30,
                booking_window_days: 30,
                booking_buffer_minutes: 10,
                default_start_time: '09:00',
                default_end_time: '18:00',
            };
        }
    },

    /**
     * Update salon settings (Owner only)
     */
    async updateSalonSettings(settings: Partial<SalonSettings>): Promise<{ success: boolean; message: string }> {
        try {
            const { error } = await supabase
                .from('salon_settings')
                .update(settings)
                .eq('id', '00000000-0000-0000-0000-000000000001');

            if (error) throw error;

            return { success: true, message: 'Settings updated successfully' };
        } catch (error: unknown) {
            console.error('Error updating settings:', error);
            const message = error instanceof Error ? error.message : 'Failed to update settings';
            return { success: false, message };
        }
    },

    /**
     * Get available time slots for a stylist on a specific date
     */
    async getAvailableTimeSlots(
        stylistId: string,
        date: string,
        serviceDuration: number
    ): Promise<TimeSlot[]> {
        try {
            console.log('🔍 getAvailableTimeSlots called with:', { stylistId, date, serviceDuration });

            // 1. Get salon settings
            const settings = await this.getSalonSettings();
            if (!settings) return [];
            console.log('⚙️ Salon settings:', settings);

            // 2. Get stylist working hours and emergency status
            const { data: stylist } = await supabase
                .from('staff')
                .select('working_hours, working_days, is_emergency_unavailable')
                .eq('id', stylistId)
                .single();

            if (!stylist) return [];
            console.log('👤 Stylist info:', stylist);

            // Check for emergency unavailability
            const today = new Date().toISOString().split('T')[0];
            if (stylist.is_emergency_unavailable && date >= today) {
                console.log('🚨 Stylist is in emergency unavailable mode');
                return [];
            }

            // Check if stylist works on this day
            const [year, month, day] = date.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day); // Local midnight
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            if (stylist.working_days && !stylist.working_days.includes(dayName)) {
                console.log('❌ Stylist not working on', dayName);
                return [];
            }

            const workingHours = stylist.working_hours || {
                start: settings.default_start_time,
                end: settings.default_end_time
            };
            console.log('⏰ Working hours:', workingHours);

            // 3. Get stylist breaks for this day
            const dayOfWeek = dateObj.getDay();
            const { data: breaks } = await supabase
                .from('stylist_breaks')
                .select('start_time, end_time')
                .eq('stylist_id', stylistId)
                .or(`day_of_week.eq.${dayOfWeek},day_of_week.is.null`)
                .eq('is_recurring', true);
            console.log('☕ Breaks:', breaks);

            // 4. Get stylist availability (leaves/holidays)
            const dayStart = `${date}T00:00:00`;
            const dayEnd = `${date}T23:59:59`;

            const { data: availability } = await supabase
                .from('stylist_availability')
                .select('start_time, end_time, type, reason')
                .eq('stylist_id', stylistId)
                .or(`start_time.lte.${dayEnd},end_time.gte.${dayStart}`);

            console.log('🏖️ Availability/Leaves:', availability);

            // 5. Get existing appointments
            const { data: appointments, error: aptError } = await supabase
                .rpc('get_stylist_appointments_for_scheduling', {
                    p_stylist_id: stylistId,
                    p_date: date
                });

            console.log('📅 Appointments RPC result:', { appointments, error: aptError });

            // 6. Generate time slots
            const slots: TimeSlot[] = [];
            const interval = settings.slot_interval;
            const buffer = settings.booking_buffer_minutes;

            const timeToMinutes = (time: string) => {
                const [hours, minutes] = time.split(':').map(Number);
                return hours * 60 + minutes;
            };

            const minutesToTime = (minutes: number) => {
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            };

            const startMinutes = timeToMinutes(workingHours.start);
            const endMinutes = timeToMinutes(workingHours.end);

            // Helper to get minutes from ISO string for the CURRENT date being processed
            const getMinutesFromDate = (isoString: string) => {
                const d = new Date(isoString);
                return d.getHours() * 60 + d.getMinutes();
            };

            for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
                const slotTime = minutesToTime(minutes);
                const slotEndMinutes = minutes + serviceDuration + buffer;

                let available = true;
                let reason = '';

                // Check working hours
                if (slotEndMinutes > endMinutes) {
                    available = false;
                    reason = 'Outside working hours';
                }

                // Check breaks
                if (available && breaks && breaks.length > 0) {
                    for (const breakTime of breaks) {
                        const breakStart = timeToMinutes(breakTime.start_time);
                        const breakEnd = timeToMinutes(breakTime.end_time);

                        if (
                            (minutes >= breakStart && minutes < breakEnd) ||
                            (slotEndMinutes > breakStart && slotEndMinutes <= breakEnd) ||
                            (minutes < breakStart && slotEndMinutes > breakEnd)
                        ) {
                            available = false;
                            reason = 'Break time';
                            break;
                        }
                    }
                }

                // Check availability/leaves
                if (available && availability && availability.length > 0) {
                    for (const record of availability) {
                        const recStartStr = record.start_time.split('T')[0];
                        const recEndStr = record.end_time.split('T')[0];

                        let recStartMinutes = 0;
                        let recEndMinutes = 24 * 60;

                        if (recStartStr > date) continue;
                        if (recEndStr < date) continue;

                        if (recStartStr === date) {
                            recStartMinutes = getMinutesFromDate(record.start_time);
                        }
                        if (recEndStr === date) {
                            recEndMinutes = getMinutesFromDate(record.end_time);
                        }

                        if (
                            (minutes >= recStartMinutes && minutes < recEndMinutes) ||
                            (slotEndMinutes > recStartMinutes && slotEndMinutes <= recEndMinutes) ||
                            (minutes < recStartMinutes && slotEndMinutes > recEndMinutes)
                        ) {
                            available = false;
                            reason = record.type === 'holiday' ? 'Holiday' :
                                record.type === 'half_day' ? 'Half Day Leave' :
                                    record.type === 'emergency' ? 'Unavailable (Emergency)' :
                                        'Unavailable';
                            break;
                        }
                    }
                }

                // Check appointments
                if (available && appointments && appointments.length > 0) {
                    for (const apt of appointments) {
                        const aptStart = timeToMinutes(apt.start_time);
                        const aptEnd = aptStart + apt.duration;
                        const newAppointmentEnd = slotEndMinutes - buffer;

                        const wouldOverlap = (
                            (minutes >= aptStart && minutes < aptEnd) ||
                            (newAppointmentEnd > aptStart && newAppointmentEnd <= aptEnd) ||
                            (minutes < aptStart && newAppointmentEnd > aptEnd)
                        );

                        if (wouldOverlap) {
                            available = false;
                            reason = 'Already booked';
                            break;
                        }
                    }
                }

                slots.push({
                    time: slotTime,
                    available,
                    ...(reason && { reason })
                });
            }

            return slots;
        } catch (error) {
            console.error('❌ Error getting time slots:', error);
            return [];
        }
    },

    /**
     * Get stylist breaks
     */
    async getStylistBreaks(stylistId: string): Promise<StylistBreak[]> {
        try {
            const { data, error } = await supabase
                .from('stylist_breaks')
                .select('*')
                .eq('stylist_id', stylistId)
                .order('day_of_week')
                .order('start_time');

            if (error) throw error;
            return (data as StylistBreak[]) || [];
        } catch (error) {
            console.error('Error fetching breaks:', error);
            return [];
        }
    },

    /**
     * Add or update break
     */
    async upsertBreak(breakData: Partial<StylistBreak>): Promise<{ success: boolean; message: string }> {
        try {
            const { error } = await supabase
                .from('stylist_breaks')
                .upsert(breakData);

            if (error) throw error;

            return { success: true, message: 'Break saved successfully' };
        } catch (error: unknown) {
            console.error('Error saving break:', error);
            const message = error instanceof Error ? error.message : 'Failed to save break';
            return { success: false, message };
        }
    },

    /**
     * Delete break
     */
    async deleteBreak(breakId: string): Promise<{ success: boolean; message: string }> {
        try {
            const { error } = await supabase
                .from('stylist_breaks')
                .delete()
                .eq('id', breakId);

            if (error) throw error;

            return { success: true, message: 'Break deleted successfully' };
        } catch (error: unknown) {
            console.error('Error deleting break:', error);
            const message = error instanceof Error ? error.message : 'Failed to delete break';
            return { success: false, message };
        }
    },

    /**
     * Get all available stylists with their time slots for a given service and date
     * Used for walk-in customers who don't have a specific stylist preference
     */
    async getAvailableStylistsWithSlots(
        serviceId: string,
        date: string,
        serviceDuration: number,
        branchId?: string
    ): Promise<{ stylist: any; slots: TimeSlot[]; skillDetails: any[] }[]> {
        try {
            console.log('🔍 getAvailableStylistsWithSlots called:', { serviceId, date, serviceDuration, branchId });

            // 1. Get stylists who can perform this service
            let query = supabase
                .from('staff')
                .select('*')
                .eq('role', 'Stylist')
                .eq('is_active', true)
                .eq('is_emergency_unavailable', false)
                .contains('specializations', [serviceId])
                .order('name');

            if (branchId) {
                query = query.eq('branch_id', branchId);
            }

            const { data: stylists, error: staffError } = await query;
            if (staffError) throw staffError;

            if (!stylists || stylists.length === 0) {
                console.log('❌ No stylists found with this specialization');
                return [];
            }

            console.log(`✅ Found ${stylists.length} stylists with this service skill`);

            // 2. Check for unavailable stylists on this date
            const { data: unavailable } = await supabase
                .from('stylist_unavailability')
                .select('stylist_id')
                .eq('unavailable_date', date);

            const unavailableIds = new Set((unavailable || []).map(u => u.stylist_id));

            // 3. Get all services for skill details
            const { data: services } = await supabase
                .from('services')
                .select('id, name, category')
                .eq('is_active', true);

            const serviceMap = new Map(services?.map(s => [s.id, s]) || []);

            // 4. Get available time slots for each stylist
            const results: { stylist: any; slots: TimeSlot[]; skillDetails: any[] }[] = [];

            for (const stylist of stylists) {
                // Skip if stylist is unavailable on this date
                if (unavailableIds.has(stylist.id)) {
                    console.log(`⏭️ Skipping ${stylist.name} - unavailable on ${date}`);
                    continue;
                }

                // Get time slots for this stylist (ALL slots, not just available)
                const allSlots = await this.getAvailableTimeSlots(stylist.id, date, serviceDuration);

                // Get stylist's skill details
                const skillDetails = (stylist.specializations || [])
                    .map((id: string) => serviceMap.get(id))
                    .filter(Boolean);

                // Only include if there are available slots, but return ALL slots for display
                const availableSlots = allSlots.filter(s => s.available);
                if (availableSlots.length > 0) {
                    results.push({
                        stylist,
                        slots: allSlots, // Return ALL slots for proper color coding
                        skillDetails
                    });
                    console.log(`✅ ${stylist.name} has ${availableSlots.length} available slots out of ${allSlots.length} total`);
                } else {
                    console.log(`⏭️ ${stylist.name} has no available slots`);
                }
            }

            console.log(`📊 Total: ${results.length} stylists with available slots`);
            return results;
        } catch (error) {
            console.error('❌ Error in getAvailableStylistsWithSlots:', error);
            return [];
        }
    },
};
