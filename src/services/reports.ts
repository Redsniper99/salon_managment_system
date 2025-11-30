import { supabase } from '@/lib/supabase';

export const reportsService = {
    /**
     * Get basic dashboard stats for today
     */
    async getDashboardStats() {
        const today = new Date().toISOString().split('T')[0];

        // Get today's revenue
        const { data: invoices, error: invoiceError } = await supabase
            .from('invoices')
            .select('total')
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`);

        if (invoiceError) throw invoiceError;

        const todayRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

        // Get appointment stats
        const { data: appointments, error: apptError } = await supabase
            .from('appointments')
            .select('status')
            .eq('appointment_date', today);

        if (apptError) throw apptError;

        const todayAppointments = appointments?.length || 0;
        const completedAppointments = appointments?.filter(a => a.status === 'Completed').length || 0;
        const cancelledAppointments = appointments?.filter(a => a.status === 'Cancelled').length || 0;
        const noShowAppointments = appointments?.filter(a => a.status === 'NoShow').length || 0;

        return {
            todayRevenue,
            todayAppointments,
            completedAppointments,
            cancelledAppointments,
            noShowAppointments
        };
    },

    /**
     * Get top performing services by revenue
     */
    async getTopServices(startDate: string, endDate: string) {
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select('items')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (error) throw error;

        const serviceStats = new Map<string, { revenue: number; count: number }>();

        invoices?.forEach(invoice => {
            const items = invoice.items as any[];
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const current = serviceStats.get(item.name) || { revenue: 0, count: 0 };
                    current.revenue += (item.price * item.quantity);
                    current.count += item.quantity;
                    serviceStats.set(item.name, current);
                });
            }
        });

        return Array.from(serviceStats.entries())
            .map(([serviceName, stats]) => ({
                serviceName,
                ...stats
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    },

    /**
     * Get staff performance (revenue and appointment count)
     */
    async getStaffPerformance(startDate: string, endDate: string) {
        // Get appointments with stylist info
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                id,
                stylist:staff(name),
                invoices!inner(total)
            `)
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate);

        // Note: The above query assumes a relation between appointments and invoices.
        // If the relation is on invoice -> appointment_id, we might need to query invoices and join appointments.

        // Alternative approach if the above relation doesn't exist in Supabase client types or schema:
        // Query invoices and join appointments
        const { data: invoicesWithAppt, error: invError } = await supabase
            .from('invoices')
            .select(`
                total,
                appointment:appointments(
                    stylist:staff(name)
                )
            `)
            .gte('created_at', `${startDate}T00:00:00`)
            .lte('created_at', `${endDate}T23:59:59`)
            .not('appointment', 'is', null);

        if (invError) throw invError;

        const stylistStats = new Map<string, { revenue: number; appointmentCount: number }>();

        invoicesWithAppt?.forEach((inv: any) => {
            const stylistName = inv.appointment?.stylist?.name;
            if (stylistName) {
                const current = stylistStats.get(stylistName) || { revenue: 0, appointmentCount: 0 };
                current.revenue += inv.total;
                current.appointmentCount += 1;
                stylistStats.set(stylistName, current);
            }
        });

        return Array.from(stylistStats.entries())
            .map(([stylistName, stats]) => ({
                stylistName,
                ...stats
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    }
};
