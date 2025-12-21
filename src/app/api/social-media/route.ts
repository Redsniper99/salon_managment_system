import { NextRequest, NextResponse } from 'next/server';

// Meta OAuth configuration
const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/social-media/callback';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'connect') {
        // Redirect to Facebook OAuth
        const scopes = [
            'pages_read_engagement',
            'pages_manage_posts',
            'instagram_basic',
            'instagram_content_publish'
        ].join(',');

        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
            `client_id=${META_APP_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&scope=${scopes}` +
            `&response_type=code`;

        return NextResponse.redirect(authUrl);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, accessToken, pageId, instagramAccountId } = body;

        if (action === 'exchange-token') {
            // Exchange short-lived token for long-lived token
            const response = await fetch(
                `https://graph.facebook.com/v18.0/oauth/access_token?` +
                `grant_type=fb_exchange_token` +
                `&client_id=${META_APP_ID}` +
                `&client_secret=${META_APP_SECRET}` +
                `&fb_exchange_token=${accessToken}`
            );

            const data = await response.json();

            if (data.error) {
                return NextResponse.json({ error: data.error.message }, { status: 400 });
            }

            return NextResponse.json({
                accessToken: data.access_token,
                expiresIn: data.expires_in
            });
        }

        if (action === 'get-pages') {
            // Get user's Facebook pages
            const response = await fetch(
                `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
            );

            const data = await response.json();

            if (data.error) {
                return NextResponse.json({ error: data.error.message }, { status: 400 });
            }

            return NextResponse.json({ pages: data.data });
        }

        if (action === 'get-instagram') {
            // Get Instagram Business Account linked to a Facebook page
            const response = await fetch(
                `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
            );

            const data = await response.json();

            if (data.error) {
                return NextResponse.json({ error: data.error.message }, { status: 400 });
            }

            return NextResponse.json({
                instagramAccountId: data.instagram_business_account?.id
            });
        }

        if (action === 'post-story') {
            // Post a story to Facebook and/or Instagram
            const { imageUrl, caption, platforms } = body;
            const results: any = { facebook: null, instagram: null };

            // Post to Facebook
            if (platforms.includes('facebook')) {
                try {
                    const fbResponse = await fetch(
                        `https://graph.facebook.com/v18.0/${pageId}/photos`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                url: imageUrl,
                                caption: caption || '',
                                access_token: accessToken
                            })
                        }
                    );
                    results.facebook = await fbResponse.json();
                } catch (error) {
                    results.facebook = { error: 'Failed to post to Facebook' };
                }
            }

            // Post to Instagram
            if (platforms.includes('instagram') && instagramAccountId) {
                try {
                    // Step 1: Create media container
                    const containerResponse = await fetch(
                        `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                image_url: imageUrl,
                                caption: caption || '',
                                access_token: accessToken
                            })
                        }
                    );
                    const containerData = await containerResponse.json();

                    if (containerData.id) {
                        // Step 2: Publish the container
                        const publishResponse = await fetch(
                            `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
                            {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    creation_id: containerData.id,
                                    access_token: accessToken
                                })
                            }
                        );
                        results.instagram = await publishResponse.json();
                    } else {
                        results.instagram = containerData;
                    }
                } catch (error) {
                    results.instagram = { error: 'Failed to post to Instagram' };
                }
            }

            return NextResponse.json({ results });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Social media API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
