import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function getBearerToken(request: NextRequest): string | null {
    const header = request.headers.get('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match?.[1] || null;
}

/** JWT invalid or missing */
export type StaffAuthResult =
    | { ok: true; staffId: string }
    | { ok: true; staffId: null; authenticated: true }
    | { ok: false; reason: 'unauthorized' };

/**
 * Resolve staff id for in-app notifications. Owners/managers may have no staff row;
 * they are still authenticated but have no recipient rows — return staffId: null (not 401).
 */
export async function getStaffAuthFromRequest(request: NextRequest): Promise<StaffAuthResult> {
    const token = getBearerToken(request);
    if (!token) return { ok: false, reason: 'unauthorized' };

    const supabaseAuthed = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
        data: { user },
        error,
    } = await supabaseAuthed.auth.getUser();
    if (error || !user) return { ok: false, reason: 'unauthorized' };

    const supabaseAdmin = createClient(supabaseUrl, adminKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: staff } = await supabaseAdmin
        .from('staff')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

    if (!staff?.id) {
        return { ok: true, staffId: null, authenticated: true };
    }
    return { ok: true, staffId: staff.id as string };
}
