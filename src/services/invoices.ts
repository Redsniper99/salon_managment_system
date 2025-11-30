import { supabase } from '@/lib/supabase';
import { earningsService } from './earnings';

export const invoicesService = {
    /**
     * Create a new invoice
     */
    async createInvoice(invoice: {
        customer_id: string;
        branch_id: string;
        appointment_id?: string;
        items: Array<{
            type: 'service' | 'manual';
            serviceId?: string;
            description: string;
            price: number;
            quantity: number;
        }>;
        subtotal: number;
        discount: number;
        promo_code?: string;
        tax: number;
        total: number;
        payment_method: string;
        created_by: string;
    }) {
        const { data, error } = await supabase
            .from('invoices')
            .insert(invoice)
            .select()
            .single();

        if (error) throw error;

        // Automatically calculate earnings if invoice has an appointment
        if (data && invoice.appointment_id) {
            try {
                await earningsService.updateEarningsForInvoice(data.id);
            } catch (earningsError) {
                console.error('Error updating earnings:', earningsError);
                // Don't throw - invoice creation succeeded
            }
        }

        return data;
    },

    /**
     * Get invoices with optional filters
     */
    async getInvoices(filters?: {
        customerId?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }) {
        let query = supabase
            .from('invoices')
            .select(`
                *,
                customer:customers(*)
            `)
            .order('created_at', { ascending: false });

        if (filters?.customerId) {
            query = query.eq('customer_id', filters.customerId);
        }

        if (filters?.startDate) {
            query = query.gte('created_at', filters.startDate);
        }

        if (filters?.endDate) {
            query = query.lte('created_at', filters.endDate);
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    },

    /**
     * Get invoice by ID
     */
    async getInvoiceById(id: string) {
        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                customer:customers(*),
                appointment:appointments(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Validate promo code
     */
    async validatePromoCode(code: string, cartTotal: number) {
        const { data, error } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            return { valid: false, discountAmount: 0 };
        }

        // Check if promo code is valid
        const now = new Date();
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);

        if (now < startDate || now > endDate) {
            return { valid: false, discountAmount: 0 };
        }

        if (cartTotal < data.min_spend) {
            return { valid: false, discountAmount: 0 };
        }

        if (data.usage_limit && data.used_count >= data.usage_limit) {
            return { valid: false, discountAmount: 0 };
        }

        // Calculate discount
        const discountAmount = data.type === 'percentage'
            ? (cartTotal * data.value) / 100
            : data.value;

        return { valid: true, discountAmount, promoData: data };
    },

    /**
     * Increment promo code usage
     */
    async incrementPromoUsage(code: string) {
        const { data } = await supabase
            .from('promo_codes')
            .select('used_count')
            .eq('code', code)
            .single();

        if (data) {
            await supabase
                .from('promo_codes')
                .update({ used_count: data.used_count + 1 })
                .eq('code', code);
        }
    }
};
