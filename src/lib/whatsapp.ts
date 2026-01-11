
const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0';

export async function sendWhatsAppMessage(to: string, message: any) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    console.log('📤 Sending WhatsApp message to:', to);
    console.log('🔑 Token present:', !!token, '| PhoneID:', phoneId);

    if (!token || !phoneId) {
        console.error('❌ WhatsApp credentials missing!');
        return null;
    }

    try {
        const payload = {
            messaging_product: 'whatsapp',
            to: to,
            ...message
        };
        console.log('📦 Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log('📬 WhatsApp API Response:', response.status, JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('❌ Error sending WhatsApp message:', error);
        return null;
    }
}

export function createTextMessage(text: string) {
    return {
        type: 'text',
        text: { body: text }
    };
}

export function createListMessage(header: string, body: string, buttonText: string, sections: any[]) {
    return {
        type: 'interactive',
        interactive: {
            type: 'list',
            header: {
                type: 'text',
                text: header
            },
            body: {
                text: body
            },
            action: {
                button: buttonText,
                sections: sections
            }
        }
    };
}

export function createButtonsMessage(body: string, buttons: any[]) {
    return {
        type: 'interactive',
        interactive: {
            type: 'button',
            body: {
                text: body
            },
            action: {
                buttons: buttons.map((btn) => ({
                    type: 'reply',
                    reply: {
                        id: btn.id,
                        title: btn.title
                    }
                }))
            }
        }
    };
}
