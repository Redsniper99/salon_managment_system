/**
 * Diagnostic script to test campaigns connection and identify issues
 * Run with: npx tsx src/scripts/test-campaigns-connection.ts
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('\n🔍 Campaign Connection Diagnostic Tool\n');
console.log('='.repeat(60));

// Step 1: Check environment variables
console.log('\n1️⃣  Checking Environment Variables...');
console.log('-'.repeat(60));

if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set');
} else {
    console.log('✅ NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
}

if (!supabaseAnonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
} else {
    console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey.substring(0, 20) + '...');
}

if (!supabaseUrl || !supabaseAnonKey) {
    console.log('\n❌ Missing required environment variables. Please check your .env.local file.');
    process.exit(1);
}

// Step 2: Create Supabase client
console.log('\n2️⃣  Creating Supabase Client...');
console.log('-'.repeat(60));

const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('✅ Supabase client created successfully');

// Step 3: Test basic connection
console.log('\n3️⃣  Testing Supabase Connection...');
console.log('-'.repeat(60));

async function testConnection() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error && error.message !== 'Auth session missing!') {
            console.error('❌ Connection error:', error.message);
            return false;
        }

        if (user) {
            console.log('✅ Connected and authenticated as:', user.email);
        } else {
            console.log('⚠️  Not authenticated (this may limit data access due to RLS)');
        }
        return true;
    } catch (error: any) {
        console.error('❌ Failed to connect:', error.message);
        return false;
    }
}

// Step 4: Check if campaigns table exists
console.log('\n4️⃣  Checking Campaigns Table...');
console.log('-'.repeat(60));

async function checkCampaignsTable() {
    try {
        const { data, error, count } = await supabase
            .from('campaigns')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Error accessing campaigns table:');
            console.error('   Message:', error.message);
            console.error('   Details:', error.details || 'No details');
            console.error('   Hint:', error.hint || 'No hint');
            console.error('   Code:', error.code || 'No code');

            if (error.message.includes('relation "public.campaigns" does not exist')) {
                console.log('\n💡 Solution: Run CAMPAIGNS_SCHEMA.sql in your Supabase SQL editor');
            } else if (error.message.includes('permission denied') || error.message.includes('policy')) {
                console.log('\n💡 Solution: Check RLS policies or authenticate first');
            }
            return false;
        }

        console.log('✅ Campaigns table exists');
        console.log('   Total records:', count ?? 'unknown');
        return true;
    } catch (error: any) {
        console.error('❌ Unexpected error:', error.message);
        return false;
    }
}

// Step 5: Test fetching campaigns
console.log('\n5️⃣  Testing Campaign Query...');
console.log('-'.repeat(60));

async function testCampaignsQuery() {
    try {
        // Test the new resilient approach
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('❌ Error fetching campaigns:');
            console.error('   Message:', error.message);
            console.error('   Details:', error.details || 'No details');
            console.error('   Hint:', error.hint || 'No hint');
            console.error('   Code:', error.code || 'No code');
            return false;
        }

        console.log('✅ Successfully fetched campaigns');
        console.log('   Records returned:', data?.length || 0);

        if (data && data.length > 0) {
            console.log('\n   Sample campaign:');
            console.log('   - ID:', data[0].id);
            console.log('   - Name:', data[0].name);
            console.log('   - Status:', data[0].status);

            // Try to fetch templates separately
            if (data[0].template_id) {
                console.log('\n   Testing notification_templates fetch...');
                const { data: template, error: templateError } = await supabase
                    .from('notification_templates')
                    .select('*')
                    .eq('id', data[0].template_id)
                    .single();

                if (templateError) {
                    console.log('   ⚠️  Could not fetch template (table may not exist)');
                } else {
                    console.log('   ✅ Template fetch works');
                }
            }
        }

        return true;
    } catch (error: any) {
        console.error('❌ Unexpected error:', error.message);
        console.error('   Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        return false;
    }
}

// Run all tests
async function runDiagnostics() {
    const connectionOk = await testConnection();

    if (!connectionOk) {
        console.log('\n❌ Connection test failed. Please check your Supabase URL and keys.');
        process.exit(1);
    }

    const tableOk = await checkCampaignsTable();

    if (!tableOk) {
        console.log('\n❌ Campaigns table check failed.');
        process.exit(1);
    }

    const queryOk = await testCampaignsQuery();

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Diagnostic Summary');
    console.log('-'.repeat(60));
    console.log('Environment Variables:', '✅');
    console.log('Supabase Connection:', connectionOk ? '✅' : '❌');
    console.log('Campaigns Table:', tableOk ? '✅' : '❌');
    console.log('Campaign Query:', queryOk ? '✅' : '❌');

    if (connectionOk && tableOk && queryOk) {
        console.log('\n✅ All checks passed! The campaigns feature should work correctly.');
        console.log('   If you\'re still seeing errors in the UI, ensure you\'re logged in.');
    } else {
        console.log('\n❌ Some checks failed. Please review the errors above and apply the suggested solutions.');
    }

    console.log('\n' + '='.repeat(60) + '\n');
}

runDiagnostics().catch(console.error);
