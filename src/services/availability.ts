import { supabase } from '@/lib/supabase';

export interface AvailabilityRecord {
    id: string;
    stylist_id: string;
    start_time: string;
    end_time: string;
    type: 'holiday' | 'half_day' | 'emergency' | 'break' | 'other';
    reason?: string;
    created_at: string;
}

export const availabilityService = {
    /**
     * Get availability records for a stylist within a date range
     */
    async getAvailability(stylistId: string, startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('stylist_availability')
            .select('*')
            .eq('stylist_id', stylistId)
            .gte('start_time', startDate)
            .lte('end_time', endDate);

        if (error) throw error;
        return data as AvailabilityRecord[];
    },

    /**
     * Create a new availability record (leave/holiday)
     */
    async createAvailability(record: {
        stylist_id: string;
        start_time: string;
        end_time: string;
        type: 'holiday' | 'half_day' | 'emergency' | 'break' | 'other';
        reason?: string;
    }) {
        const { data, error } = await supabase
            .from('stylist_availability')
            .insert(record)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete an availability record
     */
    async deleteAvailability(id: string) {
        const { error } = await supabase
            .from('stylist_availability')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Toggle emergency unavailability status for a stylist
     */
    async toggleEmergencyStatus(stylistId: string, isUnavailable: boolean) {
        const { data, error } = await supabase
            .from('staff')
            .update({ is_emergency_unavailable: isUnavailable })
            .eq('id', stylistId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get emergency status for a stylist
     */
    async getEmergencyStatus(stylistId: string) {
        const { data, error } = await supabase
            .from('staff')
            .select('is_emergency_unavailable')
            .eq('id', stylistId)
            .single();

        if (error) throw error;
        return data?.is_emergency_unavailable || false;
    }
};
