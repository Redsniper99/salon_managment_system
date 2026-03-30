import { supabase } from '@/lib/supabase';

/** Current user's organization (tenant). Cached per call — use from Workspace/auth when possible. */
export async function getCurrentOrganizationId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
    if (error || !profile?.organization_id) {
        throw new Error('No organization for current user');
    }
    return profile.organization_id as string;
}
