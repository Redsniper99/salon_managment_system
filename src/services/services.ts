import { supabase } from '@/lib/supabase';
import { Service } from '@/lib/types';

export const servicesService = {
    /**
     * Get all active services
     */
    async getServices(activeOnly = true) {
        let query = supabase
            .from('services')
            .select('*')
            .order('category')
            .order('name');

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    },

    /**
     * Get services by category
     */
    async getServicesByCategory(category: string) {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('category', category)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        return data;
    },

    /**
     * Get service by ID
     */
    async getServiceById(id: string) {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create a new service
     */
    async createService(service: {
        name: string;
        category: string;
        price: number;
        duration: number;
        gender?: 'Male' | 'Female' | 'Unisex';
        description?: string;
    }) {
        const { data, error } = await supabase
            .from('services')
            .insert(service)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update a service
     */
    async updateService(id: string, updates: Partial<Service>) {
        const { data, error } = await supabase
            .from('services')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Toggle service active status
     */
    async toggleServiceStatus(id: string, isActive: boolean) {
        const { data, error } = await supabase
            .from('services')
            .update({ is_active: isActive })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a service
     */
    async deleteService(id: string) {
        const { error } = await supabase
            .from('services')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};
