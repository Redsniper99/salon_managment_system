import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/social-media/callback';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/social-media?error=${encodeURIComponent(error)}`
        );
    }

    if (!code) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/social-media?error=no_code`
        );
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?` +
            `client_id=${META_APP_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&client_secret=${META_APP_SECRET}` +
            `&code=${code}`
        );

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(tokenData.error.message);
        }

        const shortLivedToken = tokenData.access_token;

        // Exchange for long-lived token
        const longLivedResponse = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?` +
            `grant_type=fb_exchange_token` +
            `&client_id=${META_APP_ID}` +
            `&client_secret=${META_APP_SECRET}` +
            `&fb_exchange_token=${shortLivedToken}`
        );

        const longLivedData = await longLivedResponse.json();
        const longLivedToken = longLivedData.access_token;

        // Get user's pages
        const pagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedToken}`
        );
        const pagesData = await pagesResponse.json();

        if (!pagesData.data || pagesData.data.length === 0) {
            throw new Error('No Facebook pages found. Please create a Facebook Business Page first.');
        }

        // Use the first page (or let user select later)
        const firstPage = pagesData.data[0];
        const pageAccessToken = firstPage.access_token;
        const pageId = firstPage.id;

        // Get Instagram Business Account linked to the page
        const igResponse = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
        );
        const igData = await igResponse.json();
        const instagramAccountId = igData.instagram_business_account?.id || null;

        // Save to database using service role for server-side operations
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Update or insert settings
        const { data: existingSettings } = await supabase
            .from('social_media_settings')
            .select('id')
            .single();

        if (existingSettings) {
            await supabase
                .from('social_media_settings')
                .update({
                    facebook_page_id: pageId,
                    facebook_page_token: pageAccessToken,
                    instagram_account_id: instagramAccountId,
                    is_connected: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingSettings.id);
        } else {
            await supabase
                .from('social_media_settings')
                .insert({
                    facebook_page_id: pageId,
                    facebook_page_token: pageAccessToken,
                    instagram_account_id: instagramAccountId,
                    is_connected: true
                });
        }

        // Redirect back to social media page with success
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/social-media?success=connected`
        );
    } catch (error: any) {
        console.error('OAuth callback error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/social-media?error=${encodeURIComponent(error.message)}`
        );
    }
}
