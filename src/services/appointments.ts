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

        // Fetch service names for each appointment
        if (data && data.length > 0) {
            const appointmentsWithServices = await Promise.all(
                data.map(async (appointment) => {
                    if (appointment.services && Array.isArray(appointment.services) && appointment.services.length > 0) {
                        const { data: services } = await supabase
                            .from('services')
                            .select('id, name')
                            .in('id', appointment.services);

                        return {
                            ...appointment,
                            service_names: services?.map(s => s.name) || [],
                            service_name: services?.[0]?.name || null
                        };
                    }
                    return {
                        ...appointment,
                        service_names: [],
                        service_name: null
                    };
                })
            );
            return appointmentsWithServices;
        }

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

        // Fetch service names
        if (data && data.services && Array.isArray(data.services) && data.services.length > 0) {
            const { data: services } = await supabase
                .from('services')
                .select('id, name')
                .in('id', data.services);

            return {
                ...data,
                service_names: services?.map(s => s.name) || [],
                service_name: services?.[0]?.name || null
            };
        }

        return {
            ...data,
            service_names: [],
            service_name: null
        };
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
        // Validate appointment slot before creating
        const { validateAppointmentSlot } = await import('@/lib/appointment-validation');

        const validation = await validateAppointmentSlot({
            stylistId: appointment.stylist_id,
            customerId: appointment.customer_id,
            date: appointment.appointment_date,
            startTime: appointment.start_time,
            duration: appointment.duration
        });

        if (!validation.isValid) {
            throw new Error(validation.reason || 'Cannot book this time slot');
        }

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

        // Send notifications via server-side API (reliable in production)
        if (data) {
            try {
                const response = await fetch('/api/appointments/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'new',
                        appointmentId: data.id
                    })
                });
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Appointment notifications sent via API');
                } else {
                    console.error('❌ Notification API error:', result.error);
                }
            } catch (notificationError) {
                console.error('❌ Failed to send notifications:', notificationError);
            }
        }

        return data;
    },

    /**
     * Create multiple appointments (for multi-service booking)
     */
    async createMultipleAppointments(appointments: Array<{
        customer_id: string;
        stylist_id: string;
        branch_id: string;
        services: string[];
        appointment_date: string;
        start_time: string;
        duration: number;
        notes?: string;
    }>) {
        // Validate ALL appointments before creating ANY
        const { validateMultipleAppointments } = await import('@/lib/appointment-validation');

        const batchValidation = await validateMultipleAppointments(
            appointments.map(apt => ({
                stylistId: apt.stylist_id,
                customerId: apt.customer_id,
                date: apt.appointment_date,
                startTime: apt.start_time,
                duration: apt.duration
            }))
        );

        if (!batchValidation.allValid) {
            throw new Error(batchValidation.firstError || 'One or more appointments have scheduling conflicts');
        }

        // All validations passed - proceed with creation
        const { data, error } = await supabase
            .from('appointments')
            .insert(
                appointments.map(apt => ({
                    ...apt,
                    status: 'Pending' as AppointmentStatus
                }))
            )
            .select(`
                *,
                customer:customers(*),
                stylist:staff(*)
            `);

        if (error) throw error;

        // Send notifications for each appointment
        if (data && data.length > 0) {
            for (const appointment of data) {
                try {
                    const response = await fetch('/api/appointments/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'new',
                            appointmentId: appointment.id
                        })
                    });
                    const result = await response.json();
                    if (result.success) {
                        console.log(`✅ Notification sent for appointment ${appointment.id}`);
                    } else {
                        console.error(`❌ Notification error for ${appointment.id}:`, result.error);
                    }
                } catch (notificationError) {
                    console.error(`❌ Failed to send notification for ${appointment.id}:`, notificationError);
                }
            }
        }

        return data;
    },

    /**
     * Update an appointment - sends notifications if time/date changed
     */
    async updateAppointment(id: string, updates: Partial<Appointment>) {
        // Get current appointment before update (to compare changes)
        const oldAppointment = await this.getAppointmentById(id);

        const { data, error } = await supabase
            .from('appointments')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                customer:customers(*),
                stylist:staff(*)
            `)
            .single();

        if (error) throw error;

        // Check if time or date was changed - send notifications via server API
        const updatesAny = updates as any;
        const timeChanged = updatesAny.start_time && updatesAny.start_time !== oldAppointment?.start_time;
        const dateChanged = updatesAny.appointment_date && updatesAny.appointment_date !== oldAppointment?.appointment_date;

        if ((timeChanged || dateChanged) && data) {
            console.log('📱 Appointment rescheduled - sending notifications via API');
            try {
                const response = await fetch('/api/appointments/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'reschedule',
                        appointmentId: data.id,
                        oldTime: oldAppointment?.start_time,
                        oldDate: oldAppointment?.appointment_date
                    })
                });
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Reschedule notifications sent via API');
                } else {
                    console.error('❌ Notification API error:', result.error);
                }
            } catch (notificationError) {
                console.error('❌ Failed to send reschedule notifications:', notificationError);
            }
        }

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
