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
            const { error } = await supabase.rpc('update_customer_stats', {
                customer_id: customerId
            });

            if (error) throw error;
        } catch (error) {
            console.error('Error updating customer stats:', error);
            throw error;
        }
    },

    /**
     * Analyze customer and determine their segments
     */
    async analyzeCustomer(customerId: string): Promise<string[]> {
        try {
            // Get customer data
            const { data: customer, error: customerError } = await supabase
                .from('customers')
                .select('*')
                .eq('id', customerId)
                .single();

            if (customerError) throw customerError;

            // Get customer's completed appointments
            const { data: appointments } = await supabase
                .from('appointments')
                .select('*')
                .eq('customer_id', customerId)
                .eq('status', 'Completed');

            // Get all segment criteria
            const { data: segments } = await supabase
                .from('customer_segments')
                .select('name, auto_criteria')
                .eq('is_active', true);

            const appliedSegments: string[] = [];

            // Analyze against each segment's criteria
            for (const segment of segments || []) {
                const criteria = segment.auto_criteria;
                let matches = true;

                // Check total visits
                if (criteria.min_visits && customer.total_visits < criteria.min_visits) {
                    matches = false;
                }
                if (criteria.max_visits && customer.total_visits > criteria.max_visits) {
                    matches = false;
                }

                // Check total spent
                if (criteria.min_total_spent && customer.total_spent < criteria.min_total_spent) {
                    matches = false;
                }

                // Check service keywords (need to fetch service names)
                if (criteria.service_keywords && criteria.min_bookings && appointments) {
                    // Get all unique service IDs from appointments
                    const serviceIds = new Set<string>();
                    appointments.forEach((apt: any) => {
                        if (apt.services && Array.isArray(apt.services)) {
                            apt.services.forEach((sid: string) => serviceIds.add(sid));
                        }
                    });

                    if (serviceIds.size > 0) {
                        // Fetch service details
                        const { data: services } = await supabase
                            .from('services')
                            .select('id, name')
                            .in('id', Array.from(serviceIds));

                        // Count appointments with matching service keywords
                        let matchingCount = 0;
                        appointments.forEach((apt: any) => {
                            if (apt.services && Array.isArray(apt.services)) {
                                const aptServices = services?.filter(s => apt.services.includes(s.id)) || [];
                                const hasKeyword = aptServices.some((s: any) =>
                                    criteria.service_keywords.some((keyword: string) =>
                                        s.name?.toLowerCase().includes(keyword.toLowerCase())
                                    )
                                );
                                if (hasKeyword) matchingCount++;
                            }
                        });

                        if (matchingCount < criteria.min_bookings) {
                            matches = false;
                        }
                    } else {
                        matches = false;
                    }
                }

                // Check days since last visit
                if (criteria.days_since_last_visit && customer.last_visit_date) {
                    const daysSince = Math.floor(
                        (new Date().getTime() - new Date(customer.last_visit_date).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    if (daysSince < criteria.days_since_last_visit) {
                        matches = false;
                    }
                }

                if (matches) {
                    appliedSegments.push(segment.name);
                }
            }

            return appliedSegments;
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

            // Analyze and get applicable segments
            const segments = await this.analyzeCustomer(customerId);

            // Update customer's segment tags
            const { error } = await supabase
                .from('customers')
                .update({ segment_tags: segments })
                .eq('id', customerId);

            if (error) throw error;

            console.log(`✅ Customer categorized into segments:`, segments);
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

            console.log(`🔄 Categorizing ${customers?.length || 0} customers...`);

            // Process each customer
            for (const customer of customers || []) {
                await this.categorizeCustomer(customer.id);
            }

            // Refresh segment counts
            await supabase.rpc('refresh_segment_counts');

            console.log('✅ All customers categorized successfully!');
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
                    console.error('RPC Error Details:', {
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        code: error.code
                    });
                    throw error;
                }
                console.log('Segment counts refreshed successfully');
            } catch (refreshError: any) {
                console.warn('Could not refresh segment counts:', refreshError?.message || refreshError);
                // Continue anyway - we'll just show the current counts
            }

            const { data, error } = await supabase
                .from('customer_segments')
                .select('*')
                .eq('is_active', true)
                .order('customer_count', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error fetching segment stats:', error);
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
