import { supabase } from '@/lib/supabase';
import { Appointment, AppointmentStatus } from '@/lib/types';
import { invoicesService } from './invoices';
import { earningsService } from './earnings';

export const appointmentsService = {
    /**
     * Get appointments with optional filters
     */
    async getAppointments(filters?: {
        date?: string;
        status?: AppointmentStatus;
        stylistId?: string;
    }) {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Check if user is a stylist
        let stylistFilterId = filters?.stylistId;

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, id')
                .eq('id', user.id)
                .single();

            if (profile?.role === 'Stylist') {
                // If user is a stylist, find their staff record
                const { data: staff } = await supabase
                    .from('staff')
                    .select('id')
                    .eq('profile_id', user.id)
                    .single();

                if (staff) {
                    // Force filter by their staff ID
                    stylistFilterId = staff.id;
                }
            }
        }

        let query = supabase
            .from('appointments')
            .select(`
                *,
                customer:customers(*),
                stylist:staff(*)
            `)
            .order('appointment_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (filters?.date) {
            query = query.eq('appointment_date', filters.date);
        }

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        if (stylistFilterId) {
            query = query.eq('stylist_id', stylistFilterId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    },

    /**
     * Get a single appointment by ID
     */
    async getAppointmentById(id: string) {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                customer:customers(*),
                stylist:staff(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create a new appointment
     */
    async createAppointment(appointment: {
        customer_id: string;
        stylist_id: string;
        branch_id: string;
        services: string[];
        appointment_date: string;
        start_time: string;
        duration: number;
        notes?: string;
    }) {
        const { data, error } = await supabase
            .from('appointments')
            .insert({
                ...appointment,
                status: 'Pending'
            })
            .select(`
                *,
                customer:customers(*),
                stylist:staff(*)
            `)
            .single();

        if (error) throw error;

        // Send email notification to stylist
        if (data && data.stylist) {
            try {
                const { notificationsService } = await import('./notifications');
                const stylist = data.stylist as any;
                const customer = data.customer as any;

                const appointmentDate = new Date(data.appointment_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                const emailSubject = `New Appointment Scheduled - ${appointmentDate}`;
                const emailMessage = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #7c3aed;">New Appointment Assigned</h2>
                        <p>Hi ${stylist.name},</p>
                        <p>A new appointment has been scheduled for you:</p>
                        
                        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #374151;">Appointment Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0;"><strong>Customer:</strong></td>
                                    <td style="padding: 8px 0;">${customer.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0;"><strong>Date:</strong></td>
                                    <td style="padding: 8px 0;">${appointmentDate}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0;"><strong>Time:</strong></td>
                                    <td style="padding: 8px 0;">${data.start_time}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0;"><strong>Duration:</strong></td>
                                    <td style="padding: 8px 0;">${data.duration} minutes</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0;"><strong>Services:</strong></td>
                                    <td style="padding: 8px 0;">${data.services.join(', ')}</td>
                                </tr>
                                ${data.notes ? `
                                <tr>
                                    <td style="padding: 8px 0;"><strong>Notes:</strong></td>
                                    <td style="padding: 8px 0;">${data.notes}</td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px;">
                            Please make sure you're available at the scheduled time. If you have any conflicts, 
                            please contact the salon manager immediately.
                        </p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                This is an automated notification from SalonFlow.
                            </p>
                        </div>
                    </div>
                `;

                await notificationsService.sendEmail(
                    stylist.email,
                    emailSubject,
                    emailMessage
                );

                console.log(`✅ Email notification sent to stylist: ${stylist.email}`);
            } catch (emailError) {
                // Log error but don't fail the appointment creation
                console.error('❌ Failed to send email to stylist:', emailError);
            }
        }

        return data;
    },

    /**
     * Update an appointment
     */
    async updateAppointment(id: string, updates: Partial<Appointment>) {
        const { data, error } = await supabase
            .from('appointments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update appointment status
     */
    async updateStatus(id: string, status: AppointmentStatus) {
        const { data, error } = await supabase
            .from('appointments')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Note: Invoice creation and earnings calculation now happens only in POS
        // when cashier creates the bill, not when appointment is marked as "Completed"
        console.log('Appointment status updated to:', status);

        return data;
    },

    /**
     * Delete an appointment
     */
    async deleteAppointment(id: string) {
        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
