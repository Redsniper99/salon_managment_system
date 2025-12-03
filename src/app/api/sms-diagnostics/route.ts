import { NextResponse } from 'next/server';

export async function GET() {
    const diagnostics = {
        environment: process.env.NODE_ENV,
        smsMode: process.env.SMS_MODE,
        hasApiKey: !!process.env.TEXT_LK_API_KEY,
        apiKeyLength: process.env.TEXT_LK_API_KEY?.length || 0,
        hasSenderId: !!process.env.TEXT_LK_SENDER_ID,
        senderId: process.env.TEXT_LK_SENDER_ID,
        isDevelopmentMode: process.env.NODE_ENV !== 'production' && process.env.SMS_MODE !== 'production',
    };

    return NextResponse.json({
        status: 'SMS Configuration Diagnostics',
        diagnostics,
        help: {
            issue: !diagnostics.hasApiKey || !diagnostics.hasSenderId ? 'Missing credentials' :
                diagnostics.isDevelopmentMode ? 'SMS_MODE not set to production' : 'Configuration looks OK',
            solution: !diagnostics.hasApiKey ? 'Add TEXT_LK_API_KEY to .env.local' :
                !diagnostics.hasSenderId ? 'Add TEXT_LK_SENDER_ID to .env.local' :
                    diagnostics.isDevelopmentMode ? 'Set SMS_MODE=production in .env.local and restart server' :
                        'Configuration is correct. Check Text.lk account balance and sender ID approval.'
        }
    });
}
