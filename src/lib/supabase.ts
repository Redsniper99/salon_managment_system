import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables - functionality will be limited');
}

// Browser client that syncs auth tokens to cookies so server actions can read the session.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (uses service role key)
// This should ONLY be used on the server side, never expose to client
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

// Helper to ensure admin client is available
export function getAdminClient() {
    if (!supabaseAdmin) {
        throw new Error(
            'Supabase admin client not available. Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local'
        );
    }
    return supabaseAdmin;
}
