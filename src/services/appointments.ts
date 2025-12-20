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

        // Send notifications to stylist (both email and SMS)
        if (data && data.stylist) {
            try {
                const { notificationsService } = await import('./notifications');
                const stylist = data.stylist as any;
                const customer = data.customer as any;

                // Get service names for display
                let serviceNames = 'Services';
                try {
                    const { data: services } = await supabase
                        .from('services')
                        .select('name')
                        .in('id', data.services);
                    if (services && services.length > 0) {
                        serviceNames = services.map(s => s.name).join(', ');
                    }
                } catch (err) {
                    console.error('Error fetching service names:', err);
                }

                const appointmentDate = new Date(data.appointment_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const shortDate = new Date(data.appointment_date).toLocaleDateString();

                // Send SMS directly to stylist (not using sendNotification since that expects customer ID)
                if (stylist.phone) {
                    try {
                        const smsMessage = `📅 New Appointment! Customer: ${customer.name}, Service: ${serviceNames}, Date: ${shortDate} at ${data.start_time}. Duration: ${data.duration} mins.`;

                        await notificationsService.sendSMS(stylist.phone, smsMessage);

                    } catch (smsError) {
                        console.error('❌ Failed to send SMS to stylist:', smsError);
                    }
                }

                // Send Email with detailed information
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
                                    <td style="padding: 8px 0;">${serviceNames}</td>
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

                if (stylist.email) {
                    await notificationsService.sendEmail(
                        stylist.email,
                        emailSubject,
                        emailMessage
                    );

                }
            } catch (notificationError) {
                // Log error but don't fail the appointment creation
                console.error('❌ Failed to send notifications to stylist:', notificationError);
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
        // Get appointment details first (for notifications)
        const appointment = await this.getAppointmentById(id);

        const { data, error } = await supabase
            .from('appointments')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Send cancellation apology if status is Cancelled
        if (status === 'Cancelled' && appointment) {
            try {
                const { notificationsService } = await import('./notifications');
                const customer = appointment.customer as any;

                if (customer && (customer.email || customer.phone)) {
                    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString();
                    const reason = 'Schedule conflict'; // Could be passed as parameter

                    await notificationsService.sendNotification(
                        customer.id,
                        'appointment_cancellation_apology',
                        {
                            customer_name: customer.name,
                            date: appointmentDate,
                            time: appointment.start_time,
                            reason: reason
                        }
                    );

                }
            } catch (notificationError) {
                console.error('❌ Failed to send cancellation apology:', notificationError);
            }
        }

        // Note: Invoice creation and earnings calculation now happens only in POS
        // when cashier creates the bill, not when appointment is marked as "Completed"


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
    },

    /**
     * Get today's appointments for a specific customer (for POS)
     */
    async getCustomerTodayAppointments(customerId: string) {
        // Use local date instead of UTC to match appointment dates correctly
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        console.log('Fetching appointments for customer:', customerId, 'on date:', today);

        // First get appointments
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                *,
                stylist:staff(id, name)
            `)
            .eq('customer_id', customerId)
            .eq('appointment_date', today)
            .in('status', ['Pending', 'Confirmed', 'InService'])
            .order('start_time', { ascending: true });

        if (error) throw error;
        if (!appointments || appointments.length === 0) return [];

        // Fetch service details for each appointment
        const appointmentsWithServices = await Promise.all(
            appointments.map(async (appointment) => {
                if (appointment.services && appointment.services.length > 0) {
                    const { data: servicesData } = await supabase
                        .from('services')
                        .select('id, name, price, duration')
                        .in('id', appointment.services);

                    return {
                        ...appointment,
                        services_data: servicesData || []
                    };
                }
                return {
                    ...appointment,
                    services_data: []
                };
            })
        );

        return appointmentsWithServices;
    },

    /**
     * Mark multiple appointments as completed via POS (after payment)
     */
    async markAppointmentsCompletedViaPOS(appointmentIds: string[]) {
        if (!appointmentIds || appointmentIds.length === 0) return [];

        const { data, error } = await supabase
            .from('appointments')
            .update({ status: 'Completed' })
            .in('id', appointmentIds)
            .select();

        if (error) throw error;
        return data;
    }
};
