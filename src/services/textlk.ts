/**
 * Text.lk SMS Gateway Service
 * Production-ready SMS sending service using Text.lk API
 * API Documentation: https://www.text.lk/docs/sms-api/send-sms
 */

interface TextLkSendResponse {
    status: 'success' | 'error';
    message: string;
    data?: {
        uid: string;
        to: string;
        from: string;
        message: string;
        status: string;
        cost: string;
        sms_count: number;
    };
}

interface TextLkConfig {
    apiKey: string;
    senderId: string;
    apiEndpoint?: string;
}

export class TextLkService {
    private apiKey: string;
    private senderId: string;
    private apiEndpoint: string;

    constructor(config: TextLkConfig) {
        this.apiKey = config.apiKey;
        this.senderId = config.senderId;
        this.apiEndpoint = config.apiEndpoint || 'https://app.text.lk/api/v3/sms/send';
    }

    /**
     * Send SMS to a single recipient
     */
    async sendSMS(to: string, message: string): Promise<TextLkSendResponse> {
        return this.sendBulkSMS([to], message);
    }

    /**
     * Send SMS to multiple recipients
     */
    async sendBulkSMS(recipients: string[], message: string, scheduleTime?: string): Promise<TextLkSendResponse> {
        try {
            // Normalize phone numbers (ensure they start with 94 for Sri Lanka)
            const normalizedRecipients = recipients.map(phone => this.normalizePhoneNumber(phone));

            const payload = {
                recipient: normalizedRecipients.join(','),
                sender_id: this.senderId,
                type: 'plain',
                message: message,
                ...(scheduleTime && { schedule_time: scheduleTime })
            };

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result: TextLkSendResponse = await response.json();

            if (result.status === 'error') {
                throw new Error(result.message || 'SMS send failed');
            }

            return result;
        } catch (error: any) {
            console.error('❌ Text.lk API Error:', error);
            return {
                status: 'error',
                message: error.message || 'Failed to send SMS'
            };
        }
    }

    /**
     * Normalize phone number to Sri Lankan format (94xxxxxxxxx)
     */
    private normalizePhoneNumber(phone: string): string {
        // Remove all non-numeric characters
        let normalized = phone.replace(/\D/g, '');

        // If starts with 0, replace with 94
        if (normalized.startsWith('0')) {
            normalized = '94' + normalized.substring(1);
        }

        // If doesn't start with 94, assume it's a local number and add 94
        if (!normalized.startsWith('94')) {
            normalized = '94' + normalized;
        }

        return normalized;
    }

    /**
     * Validate phone number format
     */
    validatePhoneNumber(phone: string): boolean {
        const normalized = this.normalizePhoneNumber(phone);
        // Sri Lankan numbers are 94 + 9 digits (mobile) or 94 + 9 digits (landline)
        return /^94[0-9]{9}$/.test(normalized);
    }
}

// Export a configured instance (will be initialized in API route)
export const createTextLkService = (apiKey: string, senderId: string) => {
    return new TextLkService({ apiKey, senderId });
};
