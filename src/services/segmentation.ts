import { supabase } from '@/lib/supabase';

interface CustomerSegment {
    id: string;
    name: string;
    description: string;
    color: string;
    icon: string;
    auto_criteria: any;
    is_active: boolean;
    customer_count: number;
}

interface CustomerStats {
    customerId: string;
    totalVisits: number;
    totalSpent: number;
    lastVisitDate: string | null;
    preferredServices: string[];
    segments: string[];
}

export const segmentationService = {
    /**
     * Get all customer segments
     */
    async getSegments(): Promise<CustomerSegment[]> {
        try {
            const { data, error } = await supabase
                .from('customer_segments')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching segments:', error);
            throw error;
        }
    },

    /**
     * Get customers by segment
     */
    async getCustomersBySegment(segmentName: string) {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .contains('segment_tags', [segmentName])
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching customers by segment:', error);
            throw error;
        }
    },

    /**
     * Update customer statistics (visits, spend, last visit)
     */
    async updateCustomerStats(customerId: string): Promise<void> {
        try {
            // Call the database function to update stats
            // Note: Function parameter is p_customer_id
            const { error } = await supabase.rpc('update_customer_stats', {
                p_customer_id: customerId
            });

            if (error) throw error;
        } catch (error) {
            console.error('Error updating customer stats:', error);
            throw error;
        }
    },

    /**
     * Analyze customer and determine their segments
     * Now uses the database function auto_categorize_customer
     */
    async analyzeCustomer(customerId: string): Promise<string[]> {
        try {
            // Call the database function to categorize
            const { error } = await supabase.rpc('auto_categorize_customer', {
                p_customer_id: customerId  // FIXED: Changed from customer_id to p_customer_id
            });

            if (error) throw error;

            // Fetch the updated segments to return them
            const { data: customer, error: fetchError } = await supabase
                .from('customers')
                .select('segment_tags')
                .eq('id', customerId)
                .single();

            if (fetchError) throw fetchError;
            return customer?.segment_tags || [];
        } catch (error) {
            console.error('Error analyzing customer:', error);
            return [];
        }
    },

    /**
     * Auto-categorize a customer based on their history
     */
    async categorizeCustomer(customerId: string): Promise<void> {
        try {
            // Update customer stats first
            await this.updateCustomerStats(customerId);

            // Auto categorize (this is now handled by DB function)
            await this.analyzeCustomer(customerId);


        } catch (error) {
            console.error('Error categorizing customer:', error);
            throw error;
        }
    },

    /**
     * Auto-categorize ALL customers
     */
    async categorizeAllCustomers(): Promise<void> {
        try {
            // Get all customers
            const { data: customers, error } = await supabase
                .from('customers')
                .select('id');

            if (error) throw error;



            // Process each customer
            for (const customer of customers || []) {
                await this.categorizeCustomer(customer.id);
            }

            // Refresh segment counts
            await supabase.rpc('refresh_segment_counts');


        } catch (error) {
            console.error('Error categorizing all customers:', error);
            throw error;
        }
    },

    async getSegmentStats(): Promise<any[]> {
        try {


            // Try to refresh counts first, but don't fail if it doesn't work
            try {

                const { data, error } = await supabase.rpc('refresh_segment_counts');
                if (error) {
                    console.error('❌ [SEGMENTATION] RPC Error Details:', {
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        code: error.code
                    });
                    throw error;
                }

            } catch (refreshError: any) {
                console.warn('⚠️ [SEGMENTATION] Could not refresh segment counts:', refreshError?.message || refreshError);
                // Continue anyway - we'll just show the current counts
            }


            const { data, error } = await supabase
                .from('customer_segments')
                .select('*')
                .eq('is_active', true)
                .order('customer_count', { ascending: false });



            if (error) {
                console.error('❌ [SEGMENTATION] Database error:', error);
                throw error;
            }



            return data || [];
        } catch (error) {
            console.error('❌ [SEGMENTATION] Error fetching segment stats:', error);
            throw error;
        }
    },

    /**
     * Manually add customer to segment
     */
    async addCustomerToSegment(customerId: string, segmentName: string): Promise<void> {
        try {
            // Get current segments
            const { data: customer } = await supabase
                .from('customers')
                .select('segment_tags')
                .eq('id', customerId)
                .single();

            const currentTags = customer?.segment_tags || [];

            if (!currentTags.includes(segmentName)) {
                const newTags = [...currentTags, segmentName];

                const { error } = await supabase
                    .from('customers')
                    .update({ segment_tags: newTags })
                    .eq('id', customerId);

                if (error) throw error;
            }
        } catch (error) {
            console.error('Error adding customer to segment:', error);
            throw error;
        }
    },

    /**
     * Remove customer from segment
     */
    async removeCustomerFromSegment(customerId: string, segmentName: string): Promise<void> {
        try {
            const { data: customer } = await supabase
                .from('customers')
                .select('segment_tags')
                .eq('id', customerId)
                .single();

            const currentTags = customer?.segment_tags || [];
            const newTags = currentTags.filter((tag: string) => tag !== segmentName);

            const { error } = await supabase
                .from('customers')
                .update({ segment_tags: newTags })
                .eq('id', customerId);

            if (error) throw error;
        } catch (error) {
            console.error('Error removing customer from segment:', error);
            throw error;
        }
    }
};
