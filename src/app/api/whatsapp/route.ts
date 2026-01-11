
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { sendWhatsAppMessage, createTextMessage } from '@/lib/whatsapp';
import crypto from 'crypto';
import { geminiModel, tools } from '@/lib/whatsapp/gemini';
import { handleFunctionCall } from '@/lib/whatsapp/function-handlers';
import { conversationManager } from '@/lib/whatsapp/conversation-manager';

// Verify request signature from Meta
function verifySignature(req: NextRequest, rawBody: string): boolean {
    const signature = req.headers.get('x-hub-signature-256');
    if (!signature) return false;

    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
        console.warn('WHATSAPP_APP_SECRET not set - skipping signature verification');
        return true;
    }

    const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSig)
    );
}

// Verify Webhook (GET)
export async function GET(req: NextRequest) {
    const mode = req.nextUrl.searchParams.get('hub.mode');
    const token = req.nextUrl.searchParams.get('hub.verify_token');
    const challenge = req.nextUrl.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
}

// Handle Incoming Messages (POST)
export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();

        if (!verifySignature(req, rawBody)) {
            console.error('Invalid WhatsApp webhook signature');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = JSON.parse(rawBody);
        const supabase = getAdminClient();

        console.log('📩 WhatsApp Webhook received');

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
            const from = message.from;
            const text = message.text?.body || message.interactive?.list_reply?.title || message.interactive?.button_reply?.title || '';

            if (!text) return NextResponse.json({ success: true });

            console.log(`📱 From: ${from} | Msg: ${text}`);

            // 1. Get Conversation History
            const history = await conversationManager.getHistory(from);

            // 2. Start Gemini Chat
            const chat = geminiModel.startChat({
                history: history,
                tools: tools as any,
            });

            // 4. Send Message to Gemini
            const result = await chat.sendMessage(text);
            let response = result.response;

            // 5. Handle Function Calls (Loops if multiple calls)
            let callCount = 0;
            while (response.candidates?.[0]?.content?.parts?.some(p => p.functionCall) && callCount < 5) {
                const parts = response.candidates[0].content.parts;
                const toolResults = [];

                for (const part of parts) {
                    if (part.functionCall) {
                        const { name, args } = part.functionCall;
                        const functionResult = await handleFunctionCall(name, args, from);
                        toolResults.push({
                            functionResponse: {
                                name,
                                response: functionResult
                            }
                        });
                    }
                }

                if (toolResults.length > 0) {
                    const nextResult = await chat.sendMessage(toolResults);
                    response = nextResult.response;
                }
                callCount++;
            }

            const finalAiText = response.text();

            // 6. Send Response to WhatsApp
            await sendWhatsAppMessage(from, createTextMessage(finalAiText));

            // 7. Save History
            await conversationManager.saveMessage(from, 'user', text);
            await conversationManager.saveMessage(from, 'model', finalAiText);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


