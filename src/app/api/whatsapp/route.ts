
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { sendWhatsAppMessage, createTextMessage, createListMessage } from '@/lib/whatsapp';
import crypto from 'crypto';

// Verify request signature from Meta
function verifySignature(req: NextRequest, rawBody: string): boolean {
    const signature = req.headers.get('x-hub-signature-256');
    if (!signature) return false;

    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
        console.warn('WHATSAPP_APP_SECRET not set - skipping signature verification');
        return true; // Allow in dev if secret not configured
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
        // Get raw body for signature verification
        const rawBody = await req.text();

        // Verify signature
        if (!verifySignature(req, rawBody)) {
            console.error('Invalid WhatsApp webhook signature');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = JSON.parse(rawBody);
        const supabase = getAdminClient();

        console.log('📩 WhatsApp Webhook received:', JSON.stringify(body, null, 2));

        // Check if this is a message from a user
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        console.log('📨 Extracted message:', message);

        if (message) {
            const from = message.from; // Phone number
            const text = message.text?.body || '';
            const interactive = message.interactive;

            console.log('📱 From:', from, '| Text:', text);

            // Get current session
            let { data: session } = await supabase
                .from('bot_sessions')
                .select('*')
                .eq('phone_number', from)
                .single();

            // Initialize session if new
            if (!session) {
                const { data: newSession, error } = await supabase
                    .from('bot_sessions')
                    .insert({ phone_number: from, status: 'MENU', temp_data: {} })
                    .select()
                    .single();
                session = newSession;
            }

            // --- LOGIC FLOW ---

            // 1. Reset / Start Over
            if (text.toLowerCase() === 'hi' || text.toLowerCase() === 'menu') {
                await supabase
                    .from('bot_sessions')
                    .update({ status: 'MENU', temp_data: {} })
                    .eq('phone_number', from);

                await sendWhatsAppMessage(from, createListMessage(
                    'Welcome to Salon!',
                    'How can we help you today?',
                    'Menu',
                    [{
                        title: 'Options',
                        rows: [
                            { id: 'BOOK_APPT', title: 'Book Appointment' },
                            { id: 'CHECK_APPT', title: 'Check My Booking' }
                        ]
                    }]
                ));
                return NextResponse.json({ success: true });
            }

            // 2. Handle Menu Selection
            if (session.status === 'MENU' && interactive?.type === 'list_reply') {
                const selectedId = interactive.list_reply.id;

                if (selectedId === 'BOOK_APPT') {
                    // Show service categories first
                    const categories = ['Hair', 'Beard', 'Facial', 'Bridal', 'Kids', 'Spa', 'Other'];
                    const rows = categories.map(cat => ({ id: `CAT_${cat}`, title: cat }));

                    await sendWhatsAppMessage(from, createListMessage(
                        'Select Category',
                        'What type of service are you looking for?',
                        'Categories',
                        [{ title: 'Service Categories', rows: rows }]
                    ));

                    await supabase
                        .from('bot_sessions')
                        .update({ status: 'SELECT_CATEGORY' })
                        .eq('phone_number', from);

                } else if (selectedId === 'CHECK_APPT') {
                    // Check for existing appointments
                    const { data: appointments } = await supabase
                        .from('appointments')
                        .select('*, services(*), staff(name)')
                        .or(`status.eq.Pending,status.eq.Confirmed`)
                        .order('appointment_date', { ascending: true })
                        .limit(3);

                    if (appointments && appointments.length > 0) {
                        let msg = '📅 *Your Upcoming Appointments:*\n\n';
                        appointments.forEach((apt: any, i: number) => {
                            const date = new Date(apt.appointment_date).toLocaleDateString();
                            msg += `${i + 1}. ${date} at ${apt.start_time}\n   Status: ${apt.status}\n\n`;
                        });
                        await sendWhatsAppMessage(from, createTextMessage(msg));
                    } else {
                        await sendWhatsAppMessage(from, createTextMessage('You have no upcoming appointments. Type "Hi" to book one!'));
                    }
                }
            }

            // 3. Handle Category Selection
            else if (session.status === 'SELECT_CATEGORY' && interactive?.list_reply) {
                const categoryId = interactive.list_reply.id;
                const category = categoryId.replace('CAT_', ''); // Extract category name

                // Fetch services in this category
                const { data: services } = await supabase
                    .from('services')
                    .select('id, name, price, duration')
                    .eq('category', category)
                    .eq('is_active', true)
                    .limit(10);

                if (services && services.length > 0) {
                    const rows = services.map((s: any) => ({
                        id: s.id,
                        title: s.name.substring(0, 24),
                        description: `Rs.${s.price} • ${s.duration}min`
                    }));

                    await sendWhatsAppMessage(from, createListMessage(
                        `${category} Services`,
                        `Select a ${category.toLowerCase()} service:`,
                        'Services',
                        [{ title: 'Available Services', rows: rows }]
                    ));

                    await supabase
                        .from('bot_sessions')
                        .update({
                            status: 'SELECT_SERVICE',
                            temp_data: { category }
                        })
                        .eq('phone_number', from);
                } else {
                    await sendWhatsAppMessage(from, createTextMessage(
                        `No ${category} services available. Type "menu" to try another category.`
                    ));
                }
            }

            // 3. Handle Service Selection
            else if (session.status === 'SELECT_SERVICE' && interactive?.list_reply) {
                const serviceId = interactive.list_reply.id;
                const serviceName = interactive.list_reply.title;

                // Ask for Date (simplified - just providing Today/Tomorrow buttons)
                // properly implementing a calendar in WA is complex, usually requires text input "YYYY-MM-DD"

                await sendWhatsAppMessage(from, createTextMessage(`You chose ${serviceName}. Please reply with a date (YYYY-MM-DD) e.g. 2025-12-18`));

                await supabase
                    .from('bot_sessions')
                    .update({
                        status: 'SELECT_DATE',
                        temp_data: { ...session.temp_data, service_id: serviceId, service_name: serviceName }
                    })
                    .eq('phone_number', from);
            }

            // 4. Handle Date Input
            else if (session.status === 'SELECT_DATE' && text) {
                // Validate date format (simple check)
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(text)) {
                    await sendWhatsAppMessage(from, createTextMessage('Invalid format. Please use YYYY-MM-DD (e.g. 2025-12-18).'));
                    return NextResponse.json({ success: true });
                }

                const serviceId = session.temp_data.service_id;

                // Call Internal Helper (fetching directly from DB logic for speed in this demo)
                // In real app, consider calling your new consolidate-availability API
                // For now, let's just create a pending booking recommendation or just text back

                // Simplified flow: Verification Only
                await sendWhatsAppMessage(from, createTextMessage(`Checking availability for ${text}... (Logic Pending)`));

                // ... (Call availability logic here) ...

                // Move to confirm
                // await supabase.from('bot_sessions').update({ status: 'CONFIRM' }).eq('phone_number', from);
            }

        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
