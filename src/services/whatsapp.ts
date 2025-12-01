import { supabase } from '@/lib/supabase';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0';

interface WhatsAppMessage {
    messaging_product: 'whatsapp';
    to: string;
    type: 'template' | 'text';
    template?: {
        name: string;
        language: {
            code: string;
        };
        components?: any[];
    };
    text?: {
        body: string;
    };
}

export const whatsappService = {
    /**
     * Send a WhatsApp message (Template or Text)
     */
    async sendMessage(payload: WhatsAppMessage) {
        const token = process.env.WHATSAPP_API_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

        if (!token || !phoneId) {
            console.error('❌ WhatsApp configuration missing');
            return { success: false, error: 'WhatsApp configuration missing' };
        }

        try {
            const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ WhatsApp API Error:', data);
                throw new Error(data.error?.message || 'Failed to send WhatsApp message');
            }

            return { success: true, data };
        } catch (error: any) {
            console.error('Error sending WhatsApp message:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Send a Template Message (Required for business-initiated conversations)
     */
    async sendTemplate(to: string, templateName: string, languageCode = 'en_US', components: any[] = []) {
        // Format phone number (remove + and spaces, ensure it has country code)
        // This is a basic formatter, might need more robust logic depending on input
        const formattedTo = to.replace(/\D/g, '');

        const payload: WhatsAppMessage = {
            messaging_product: 'whatsapp',
            to: formattedTo,
            type: 'template',
            template: {
                name: templateName,
                language: {
                    code: languageCode,
                },
                components,
            },
        };

        return this.sendMessage(payload);
    },

    /**
     * Send a Free-form Text Message (Only allowed within 24h of user message)
     */
    async sendText(to: string, body: string) {
        const formattedTo = to.replace(/\D/g, '');

        const payload: WhatsAppMessage = {
            messaging_product: 'whatsapp',
            to: formattedTo,
            type: 'text',
            text: {
                body,
            },
        };

        return this.sendMessage(payload);
    }
};
