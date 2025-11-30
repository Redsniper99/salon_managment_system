import { supabase } from '@/lib/supabase';
import { Customer } from '@/lib/types';

export const customersService = {
    /**
     * Search customers by name or phone
     */
    async searchCustomers(searchQuery: string) {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                invoices (
                    total,
                    created_at
                )
            `)
            .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
            .order('name')
            .limit(10);

        if (error) throw error;

        // Process data to get only the last invoice
        return data.map(customer => ({
            ...customer,
            last_invoice: customer.invoices?.sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
        }));
    },

    /**
     * Get all customers with pagination
     */
    async getCustomers(page = 0, limit = 50) {
        const from = page * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('customers')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;
        return { data, count };
    },

    /**
     * Get customer by ID with appointment history
     */
    async getCustomerById(id: string) {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                appointments(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get customer by phone number
     */
    async getCustomerByPhone(phone: string) {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    /**
     * Create a new customer
     */
    async createCustomer(customer: {
        name: string;
        phone: string;
        email?: string;
        gender?: 'Male' | 'Female' | 'Other';
        preferences?: string;
    }) {
        const { data, error } = await supabase
            .from('customers')
            .insert(customer)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update customer information
     */
    async updateCustomer(id: string, updates: Partial<Customer>) {
        const { data, error } = await supabase
            .from('customers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Increment customer visit count and update last visit
     */
    async recordVisit(customerId: string, amount: number) {
        const { data: customer } = await supabase
            .from('customers')
            .select('total_visits, total_spent')
            .eq('id', customerId)
            .single();

        if (customer) {
            const { error } = await supabase
                .from('customers')
                .update({
                    total_visits: customer.total_visits + 1,
                    total_spent: customer.total_spent + amount,
                    last_visit: new Date().toISOString()
                })
                .eq('id', customerId);

            if (error) throw error;
        }
    },

    /**
     * Delete a customer
     */
    async deleteCustomer(id: string) {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};
