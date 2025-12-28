import { supabase } from '@/lib/supabase';

interface StaffEarning {
    id: string;
    staff_id: string;
    date: string;
    service_revenue: number;
    commission_amount: number;
    salary_amount: number;
    total_earnings: number;
    appointments_count: number;
}

export const earningsService = {
    /**
     * Calculate and update earnings for a stylist based on invoice
     */
    async updateEarningsForInvoice(invoiceId: string) {
        try {

            // Get invoice details
            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    appointment:appointments(
                        stylist_id,
                        appointment_date
                    )
                `)
                .eq('id', invoiceId)
                .single();

            if (invoiceError) throw invoiceError;
            if (!invoice?.appointment) {
                console.warn('Invoice has no appointment linked:', invoiceId);
                return;
            }

            const stylistId = invoice.appointment.stylist_id;
            const date = invoice.appointment.appointment_date;

            if (!stylistId) {
                console.warn('Appointment has no stylist assigned:', invoice.appointment_id);
                return;
            }

            // Get commission settings for stylist role
            const { data: commissionSettings } = await supabase
                .from('commission_settings')
                .select('*')
                .eq('role', 'Stylist')
                .eq('is_active', true)
                .single();

            const commissionRate = commissionSettings?.commission_percentage || 40;


            // Calculate service revenue (only services, not products/manual fees)
            const items = invoice.items as any[];
            const serviceRevenue = items
                .filter((item: any) => item.type === 'service')
                .reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);



            if (serviceRevenue === 0) {
                console.warn('Service revenue is 0, skipping earnings update');
                return;
            }

            const commissionAmount = (serviceRevenue * commissionRate) / 100;

            // Get or create earnings record for this date
            const { data: existingEarning } = await supabase
                .from('staff_earnings')
                .select('*')
                .eq('staff_id', stylistId)
                .eq('date', date)
                .single();

            if (existingEarning) {
                // Update existing record

                await supabase
                    .from('staff_earnings')
                    .update({
                        service_revenue: existingEarning.service_revenue + serviceRevenue,
                        commission_amount: existingEarning.commission_amount + commissionAmount,
                        total_earnings: existingEarning.total_earnings + commissionAmount,
                        appointments_count: existingEarning.appointments_count + 1,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingEarning.id);
            } else {
                // Create new record

                await supabase
                    .from('staff_earnings')
                    .insert({
                        staff_id: stylistId,
                        date,
                        service_revenue: serviceRevenue,
                        commission_amount: commissionAmount,
                        salary_amount: 0,
                        total_earnings: commissionAmount,
                        appointments_count: 1
                    });
            }
        } catch (error) {
            console.error('Error updating earnings for invoice:', error);
            throw error;
        }
    },

    /**
     * Calculate daily salary for non-stylist staff
     */
    async calculateDailySalary(staffId: string, date: string) {
        try {
            // Get staff role
            const { data: staff } = await supabase
                .from('staff')
                .select('role')
                .eq('id', staffId)
                .single();

            if (staff?.role === 'Stylist') {
                return; // Stylists don't get daily salary
            }

            // Get salary settings
            const { data: salarySettings } = await supabase
                .from('salary_settings')
                .select('*')
                .eq('staff_id', staffId)
                .eq('is_active', true)
                .single();

            if (!salarySettings) return;

            const salaryAmount = salarySettings.salary_type === 'daily'
                ? salarySettings.amount
                : salarySettings.amount / 30; // Monthly salary divided by 30 days

            // Get or create earnings record
            const { data: existingEarning } = await supabase
                .from('staff_earnings')
                .select('*')
                .eq('staff_id', staffId)
                .eq('date', date)
                .single();

            if (existingEarning) {
                await supabase
                    .from('staff_earnings')
                    .update({
                        salary_amount: salaryAmount,
                        total_earnings: existingEarning.commission_amount + salaryAmount,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingEarning.id);
            } else {
                await supabase
                    .from('staff_earnings')
                    .insert({
                        staff_id: staffId,
                        date,
                        service_revenue: 0,
                        commission_amount: 0,
                        salary_amount: salaryAmount,
                        total_earnings: salaryAmount,
                        appointments_count: 0
                    });
            }
        } catch (error) {
            console.error('Error calculating daily salary:', error);
            throw error;
        }
    },

    /**
     * Get staff earnings for a date range
     */
    async getStaffEarnings(staffId: string, startDate: string, endDate: string) {
        try {
            const { data, error } = await supabase
                .from('staff_earnings')
                .select('*')
                .eq('staff_id', staffId)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });

            if (error) throw error;
            return data as StaffEarning[];
        } catch (error) {
            console.error('Error fetching staff earnings:', error);
            throw error;
        }
    },

    /**
     * Get all staff earnings summary (for owner/manager)
     */
    async getAllStaffEarnings(startDate: string, endDate: string) {
        try {
            const { data, error } = await supabase
                .from('staff_earnings')
                .select(`
                    *,
                    staff:staff(id, name, role)
                `)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching all staff earnings:', error);
            throw error;
        }
    },

    /**
     * Get earnings summary by staff member
     */
    async getEarningsSummaryByStaff(startDate: string, endDate: string) {
        try {
            // 1. Get all active staff first
            const { data: allStaff, error: staffError } = await supabase
                .from('staff')
                .select('id, name, role')
                .eq('is_active', true)
                .order('name');

            if (staffError) throw staffError;

            // 2. Get earnings for the period
            const earnings = await this.getAllStaffEarnings(startDate, endDate);

            // 3. Group earnings by staff
            const earningsMap = new Map();
            earnings?.forEach((earning: any) => {
                const staffId = earning.staff_id;
                if (!earningsMap.has(staffId)) {
                    earningsMap.set(staffId, {
                        total_revenue: 0,
                        total_commission: 0,
                        total_salary: 0,
                        total_earnings: 0,
                        appointments_count: 0
                    });
                }

                const summary = earningsMap.get(staffId);
                summary.total_revenue += earning.service_revenue || 0;
                summary.total_commission += earning.commission_amount || 0;
                summary.total_salary += earning.salary_amount || 0;
                summary.total_earnings += earning.total_earnings || 0;
                summary.appointments_count += earning.appointments_count || 0;
            });

            // 4. Merge all staff with earnings (including those with 0)
            const result = allStaff?.map(staff => {
                const staffEarnings = earningsMap.get(staff.id) || {
                    total_revenue: 0,
                    total_commission: 0,
                    total_salary: 0,
                    total_earnings: 0,
                    appointments_count: 0
                };

                return {
                    staff_id: staff.id,
                    staff_name: staff.name,
                    staff_role: staff.role,
                    ...staffEarnings
                };
            });

            return result;
        } catch (error) {
            console.error('Error getting earnings summary:', error);
            throw error;
        }
    },

    /**
     * Update earnings for multiple appointments in a single invoice (from POS)
     */
    async updateEarningsForMultipleAppointments(
        appointmentIds: string[],
        invoiceItems: any[],
        invoiceId: string
    ) {
        try {
            // Get all appointments with stylist info
            const { data: appointments, error: appointmentsError } = await supabase
                .from('appointments')
                .select(`
                    id,
                    stylist_id,
                    appointment_date,
                    services,
                    stylist:staff(id, commission)
                `)
                .in('id', appointmentIds);

            if (appointmentsError) throw appointmentsError;
            if (!appointments || appointments.length === 0) {
                console.warn('No appointments found for earnings update');
                return;
            }

            // Default commission rate (fallback if staff doesn't have one set)
            const DEFAULT_COMMISSION = 40;

            // Calculate earnings per stylist per appointment
            for (const appointment of appointments) {
                const stylistId = appointment.stylist_id;
                const date = appointment.appointment_date;

                if (!stylistId) {
                    console.warn(`Appointment ${appointment.id} has no stylist assigned`);
                    continue;
                }

                // Get commission rate from stylist record, fall back to global settings
                let commissionRate = DEFAULT_COMMISSION;
                const stylistData = appointment.stylist as any; // Type assertion for nested relation
                if (stylistData && stylistData.commission) {
                    commissionRate = stylistData.commission;
                } else {
                    // Fallback to commission_settings table
                    const { data: commissionSettings } = await supabase
                        .from('commission_settings')
                        .select('*')
                        .eq('role', 'Stylist')
                        .eq('is_active', true)
                        .single();
                    if (commissionSettings?.commission_percentage) {
                        commissionRate = commissionSettings.commission_percentage;
                    }
                }

                // Find items belonging to this appointment
                let serviceRevenue = 0;
                let additionalFeesTotal = 0;

                for (const item of invoiceItems) {
                    // Match items by appointmentId
                    if (item.appointmentId === appointment.id) {
                        if (item.type === 'service' || item.type === 'appointment') {
                            const itemRevenue = (item.price || 0) * (item.quantity || 1);
                            serviceRevenue += itemRevenue;

                            // Add additional fee if present
                            const additionalFee = item.additionalFee || 0;
                            additionalFeesTotal += additionalFee;
                        }
                    }
                }

                if (serviceRevenue === 0 && additionalFeesTotal === 0) {
                    continue;
                }

                // Calculate commission on both service revenue and additional fees
                const totalRevenue = serviceRevenue + additionalFeesTotal;
                const commissionAmount = (totalRevenue * commissionRate) / 100;

                console.log(`💰 Earnings for ${appointment.id}: Revenue=${totalRevenue} (Service=${serviceRevenue}, AddFees=${additionalFeesTotal}), Commission=${commissionAmount} (${commissionRate}%)`);

                // Get or create earnings record for this date
                const { data: existingEarning } = await supabase
                    .from('staff_earnings')
                    .select('*')
                    .eq('staff_id', stylistId)
                    .eq('date', date)
                    .single();

                if (existingEarning) {
                    // Update existing record
                    await supabase
                        .from('staff_earnings')
                        .update({
                            service_revenue: existingEarning.service_revenue + totalRevenue,
                            commission_amount: existingEarning.commission_amount + commissionAmount,
                            total_earnings: existingEarning.total_earnings + commissionAmount,
                            appointments_count: existingEarning.appointments_count + 1,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingEarning.id);
                } else {
                    // Create new record
                    await supabase
                        .from('staff_earnings')
                        .insert({
                            staff_id: stylistId,
                            date,
                            service_revenue: totalRevenue,
                            commission_amount: commissionAmount,
                            salary_amount: 0,
                            total_earnings: commissionAmount,
                            appointments_count: 1
                        });
                }
            }
        } catch (error) {
            console.error('Error updating earnings for multiple appointments:', error);
            throw error;
        }
    }
};
