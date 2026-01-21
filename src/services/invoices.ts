import { supabase } from '@/lib/supabase';
import { earningsService } from './earnings';
import { getLocalDateString } from '@/lib/utils';

export const invoicesService = {
    async createInvoice(invoice: {
        customer_id: string;
        branch_id: string;
        appointment_id?: string;
        appointment_ids?: string[]; // NEW: Support multiple appointments
        items: Array<{
            type: 'service' | 'manual' | 'appointment';
            serviceId?: string;
            appointmentId?: string;
            description: string;
            name?: string;
            price: number;
            quantity: number;
        }>;
        subtotal: number;
        discount: number;
        promo_code?: string;
        tax: number;
        total: number;
        payment_method: string;
        payment_breakdown?: Array<{ method: string; amount: number }>; // NEW: Split payment support
        created_by: string;
    }) {
        // Validate payment breakdown if provided
        if (invoice.payment_breakdown && invoice.payment_breakdown.length > 0) {
            const breakdownTotal = invoice.payment_breakdown.reduce((sum, p) => sum + p.amount, 0);
            // Allow small rounding differences (1 cent)
            if (Math.abs(breakdownTotal - invoice.total) > 0.01) {
                throw new Error(`Payment breakdown total (${breakdownTotal}) does not match invoice total (${invoice.total})`);
            }
            // Ensure at least 2 payment methods for split
            if (invoice.payment_breakdown.length < 2) {
                throw new Error('Split payment requires at least 2 payment methods');
            }
            // Ensure all amounts are positive
            if (invoice.payment_breakdown.some(p => p.amount <= 0)) {
                throw new Error('All payment amounts must be greater than 0');
            }
        }

        // For backwards compatibility, use first appointment_id if appointment_ids provided
        const primaryAppointmentId = invoice.appointment_ids?.[0] || invoice.appointment_id;

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        console.log('💳 Creating invoice:', {
            invoiceNumber,
            customer_id: invoice.customer_id,
            total: invoice.total,
            payment_method: invoice.payment_method,
            payment_breakdown: invoice.payment_breakdown
        });

        const { data, error } = await supabase
            .from('invoices')
            .insert({
                invoice_number: invoiceNumber,
                customer_id: invoice.customer_id,
                branch_id: invoice.branch_id,
                appointment_id: primaryAppointmentId || null,
                items: invoice.items,
                subtotal: invoice.subtotal,
                discount: invoice.discount,
                promo_code: invoice.promo_code || null,
                tax: invoice.tax,
                total: invoice.total,
                payment_method: invoice.payment_method,
                payment_breakdown: invoice.payment_breakdown || null // NEW: Store payment breakdown
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating invoice:', error);
            throw error;
        }

        console.log('✅ Invoice created successfully:', {
            id: data.id,
            invoice_number: data.invoice_number,
            total: data.total,
            created_at: data.created_at,
            payment_breakdown: data.payment_breakdown
        });

        // Update earnings for all linked appointments
        const appointmentIds = invoice.appointment_ids || (invoice.appointment_id ? [invoice.appointment_id] : []);

        if (data && appointmentIds.length > 0) {
            try {
                await earningsService.updateEarningsForMultipleAppointments(
                    appointmentIds,
                    invoice.items,
                    data.id
                );
            } catch (earningsError: any) {
                console.error('❌ Error updating earnings:');
                if (earningsError && typeof earningsError === 'object') {
                    console.error('  Code:', earningsError.code);
                    console.error('  Message:', earningsError.message);
                    console.error('  Details:', earningsError.details);
                    console.error('  Hint:', earningsError.hint);
                }
                console.error('Error details:', {
                    message: earningsError instanceof Error ? earningsError.message : earningsError?.message || 'Unknown error',
                    appointmentIds,
                    invoiceId: data.id
                });
                // Don't throw - invoice creation succeeded
            }
        }

        // Update earnings for walk-in services (no appointment)
        const walkInItems = invoice.items.filter((item: any) => item.type === 'walk-in-service' && item.stylistId);
        if (data && walkInItems.length > 0) {
            try {
                console.log('💰 Processing walk-in earnings for invoice:', data.id);
                await earningsService.updateEarningsForWalkIn(
                    data.id,
                    invoice.items,
                    data.created_at
                );
            } catch (walkInError: any) {
                console.error('❌ Error updating walk-in earnings:', walkInError);
                // Don't throw - invoice creation succeeded
            }
        }

        return data;
    },

    /**
     * Get all available/active promo codes
     */
    async getActivePromoCodes() {
        const now = getLocalDateString();

        const { data, error } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('is_active', true)
            .lte('start_date', now)
            .gte('end_date', now);

        if (error) throw error;

        // Filter out promo codes that have exceeded their usage limit
        const validCodes = (data || []).filter(code => {
            if (code.usage_limit === null || code.usage_limit === undefined) return true;
            return code.used_count < code.usage_limit;
        });

        return validCodes;
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
