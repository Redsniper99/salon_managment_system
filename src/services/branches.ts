import { supabase } from '@/lib/supabase';
import { Branch } from '@/lib/types';

export const branchesService = {
    /**
     * Get all branches
     */
    async getBranches() {
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        return data as Branch[];
    },

    /**
     * Get a single branch by ID
     */
    async getBranchById(id: string) {
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Branch;
    },

    /**
     * Get default branch (first active one)
     */
    async getDefaultBranch() {
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .eq('is_active', true)
            .limit(1)
            .single();

        if (error) throw error;
        return data as Branch;
    }
};
