import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Format phone number for Sri Lanka
function formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
        cleaned = '94' + cleaned.substring(1);
    }

    if (!cleaned.startsWith('94')) {
        cleaned = '94' + cleaned;
    }

    return cleaned;
}

// Create Supabase admin client lazily (only when needed at runtime)
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables are not configured');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

export async function POST(request: NextRequest) {
    try {
        const { phone, otp } = await request.json();

        if (!phone || !otp) {
            return NextResponse.json(
                { success: false, error: 'Phone and OTP are required' },
                { status: 400 }
            );
        }

        const formattedPhone = formatPhone(phone);
        const supabaseAdmin = getSupabaseAdmin();

        // Find the latest unexpired OTP for this phone
        const { data: otpRecord, error: fetchError } = await supabaseAdmin
            .from('booking_otps')
            .select('*')
            .eq('phone', formattedPhone)
            .eq('verified', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (fetchError || !otpRecord) {
            return NextResponse.json(
                { success: false, error: 'OTP expired or not found. Please request a new one.' },
                { status: 400 }
            );
        }

        // Check attempts (max 3)
        if (otpRecord.attempts >= 3) {
            return NextResponse.json(
                { success: false, error: 'Too many attempts. Please request a new OTP.' },
                { status: 429 }
            );
        }

        // Increment attempts
        await supabaseAdmin
            .from('booking_otps')
            .update({ attempts: otpRecord.attempts + 1 })
            .eq('id', otpRecord.id);

        // Verify OTP
        if (otpRecord.otp !== otp) {
            return NextResponse.json(
                { success: false, error: 'Invalid OTP. Please try again.' },
                { status: 400 }
            );
        }

        // Mark OTP as verified
        await supabaseAdmin
            .from('booking_otps')
            .update({ verified: true })
            .eq('id', otpRecord.id);

        // ============================================
        // CREATE OR GET SUPABASE AUTH USER
        // ============================================

        const email = `${formattedPhone}@phone.salonflow.local`;
        const password = `phone_${formattedPhone}_${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-10)}`;

        // Try to get existing user
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        let userId: string | null = null;
        let existingUser = existingUsers?.users?.find(u => u.email === email);

        if (existingUser) {
            userId = existingUser.id;
        } else {
            // Create new user
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                phone: `+${formattedPhone}`,
                phone_confirm: true,
                user_metadata: {
                    phone: formattedPhone,
                    auth_type: 'phone_otp',
                },
            });

            if (createError) {
                console.error('Error creating user:', createError);
                return NextResponse.json(
                    { success: false, error: 'Failed to create user session' },
                    { status: 500 }
                );
            }

            userId = newUser.user?.id || null;
        }

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Failed to get user' },
                { status: 500 }
            );
        }

        // Generate session for the user
        const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email,
        });

        // Sign in the user directly using admin
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError || !signInData.session) {
            console.error('Error signing in:', signInError);
            return NextResponse.json(
                { success: false, error: 'Failed to create session' },
                { status: 500 }
            );
        }

        // Return the session tokens
        return NextResponse.json({
            success: true,
            message: 'OTP verified and session created',
            session: {
                access_token: signInData.session.access_token,
                refresh_token: signInData.session.refresh_token,
                expires_at: signInData.session.expires_at,
                user: {
                    id: signInData.user.id,
                    phone: formattedPhone,
                },
            },
        });

    } catch (error) {
        console.error('OTP verify error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
