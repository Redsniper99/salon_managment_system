import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

interface NotificationTemplate {
    id: string;
    name: string;
    type: 'appointment_confirmation' | 'appointment_reminder' | 'appointment_cancellation' | 'promotional';
    channel: 'sms' | 'email' | 'both';
    subject?: string;
    message: string;
    is_active: boolean;
}

interface TemplateVariables {
    customer_name?: string;
    date?: string;
    time?: string;
    service?: string;
    stylist?: string;
    [key: string]: string | undefined;
}

// Initialize Resend (Email) - only if API key is present
const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

export const notificationsService = {
    /**
     * Get all notification templates
     */
    async getTemplates() {
        try {
            const { data, error } = await supabase
                .from('notification_templates')
                .select('*')
                .order('type');

            if (error) throw error;
            return data as NotificationTemplate[];
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw error;
        }
    },

    /**
     * Get template by type
     */
    async getTemplateByType(type: string) {
        try {
            const { data, error } = await supabase
                .from('notification_templates')
                .select('*')
                .eq('type', type)
                .eq('is_active', true)
                .single();

            if (error) throw error;
            return data as NotificationTemplate;
        } catch (error) {
            console.error('Error fetching template:', error);
            throw error;
        }
    },

    /**
     * Create new template
     */
    async createTemplate(template: Omit<NotificationTemplate, 'id'>) {
        try {
            const { data, error } = await supabase
                .from('notification_templates')
                .insert(template)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating template:', error);
            throw error;
        }
    },

    /**
     * Update template
     */
    async updateTemplate(id: string, updates: Partial<NotificationTemplate>) {
        try {
            const { data, error } = await supabase
                .from('notification_templates')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating template:', error);
            throw error;
        }
    },

    /**
     * Delete template
     */
    async deleteTemplate(id: string) {
        try {
            const { error } = await supabase
                .from('notification_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting template:', error);
            throw error;
        }
    },

    /**
     * Replace variables in template message
     */
    replaceVariables(message: string, variables: TemplateVariables): string {
        let result = message;

        Object.entries(variables).forEach(([key, value]) => {
            if (value) {
                const placeholder = `{${key}}`;
                result = result.replace(new RegExp(placeholder, 'g'), value);
            }
        });

        return result;
    },

    /**
     * Preview template with variables
     */
    async previewTemplate(templateId: string, variables: TemplateVariables) {
        try {
            const { data: template, error } = await supabase
                .from('notification_templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (error) throw error;

            return {
                subject: template.subject ? this.replaceVariables(template.subject, variables) : undefined,
                message: this.replaceVariables(template.message, variables)
            };
        } catch (error) {
            console.error('Error previewing template:', error);
            throw error;
        }
    },

    /**
     * Send email using Resend (ACTUALLY SENDS)
     */
    async sendEmail(to: string, subject: string, message: string) {
        try {
            if (!resend || !process.env.RESEND_API_KEY) {
                console.warn('⚠️  Resend not configured - email not sent');
                console.log('📧 Would send email to:', to);
                console.log('📧 Subject:', subject);
                console.log('📧 Message:', message);
                return { success: false, error: 'Email service not configured' };
            }

            const { data, error } = await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'SalonFlow <onboarding@resend.dev>',
                to: [to],
                subject: subject,
                html: `<p>${message.replace(/\n/g, '<br>')}</p>`
            });

            if (error) {
                console.error('❌ Resend error:', error);
                throw error;
            }

            console.log('✅ Email sent successfully to:', to);
            console.log('📧 Subject:', subject);
            return { success: true, data };
        } catch (error: any) {
            console.error('Error sending email:', error);
            throw error;
        }
    },

    /**
     * Mock SMS sending (LOGS TO CONSOLE for demo)
     */
    async sendSMS(to: string, message: string) {
        // Mock SMS for demo - just log it
        console.log('📱 ============ SMS NOTIFICATION (DEMO MODE) ============');
        console.log('📞 To:', to);
        console.log('💬 Message:', message);
        console.log('✅ SMS would be sent in production');
        console.log('=========================================================');

        return {
            success: true,
            data: {
                sid: 'mock-' + Date.now(),
                to,
                message,
                note: 'SMS demo mode - check console for message content'
            }
        };
    },

    /**
     * Send notification using template
     */
    async sendNotification(
        customerId: string,
        templateType: string,
        variables: TemplateVariables
    ) {
        try {
            // Get customer details
            const { data: customer, error: customerError } = await supabase
                .from('customers')
                .select('email, phone, name')
                .eq('id', customerId)
                .single();

            if (customerError) throw customerError;
            if (!customer) throw new Error('Customer not found');

            // Get template
            const template = await this.getTemplateByType(templateType);
            if (!template) {
                throw new Error('Template not found');
            }

            // Replace variables
            const message = this.replaceVariables(template.message, variables);
            const subject = template.subject
                ? this.replaceVariables(template.subject, variables)
                : 'Notification from SalonFlow';

            const results: any = {
                email: null,
                sms: null
            };

            // Send based on channel
            if (template.channel === 'email' || template.channel === 'both') {
                if (customer.email) {
                    try {
                        results.email = await this.sendEmail(customer.email, subject, message);
                    } catch (error) {
                        console.error('Email send failed:', error);
                        results.email = { success: false, error };
                    }
                }
            }

            if (template.channel === 'sms' || template.channel === 'both') {
                if (customer.phone) {
                    try {
                        results.sms = await this.sendSMS(customer.phone, message);
                    } catch (error) {
                        console.error('SMS send failed:', error);
                        results.sms = { success: false, error };
                    }
                }
            }

            return {
                success: true,
                message: 'Notification sent',
                results
            };
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }
};
