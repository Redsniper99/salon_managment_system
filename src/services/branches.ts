import { supabase } from '@/lib/supabase';
import { Branch } from '@/lib/types';
import { getCurrentOrganizationId } from '@/lib/org-scope';

export const branchesService = {
    /**
     * Get branches for the current tenant. Pass organizationId from the logged-in profile
     * so the list matches RLS and you never mix in other salons’ rows.
     */
    async getBranches(organizationId?: string | null) {
        let query = supabase
            .from('branches')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query;
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
    },

    async createBranch(input: { name: string; address: string; phone: string }) {
        const organizationId = await getCurrentOrganizationId();
        const { data, error } = await supabase
            .from('branches')
            .insert({
                name: input.name,
                address: input.address,
                phone: input.phone,
                is_active: true,
                organization_id: organizationId,
            })
            .select()
            .single();
        if (error) throw error;
        return data as Branch;
    },

    async updateBranch(
        id: string,
        updates: Partial<{ name: string; address: string; phone: string; is_active: boolean }>
    ) {
        const { data, error } = await supabase
            .from('branches')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as Branch;
    },

    async deleteBranch(id: string) {
        const { error } = await supabase.from('branches').delete().eq('id', id);
        if (error) throw error;
    },
};
