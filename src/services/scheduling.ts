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
};
