# Campaign Fetching Troubleshooting Guide

This guide helps diagnose and fix common issues with the campaigns feature.

## Quick Diagnostic

Run the diagnostic script to identify issues:
```bash
npx tsx src/scripts/test-campaigns-connection.ts
```

The script will check:
- ✅ Environment variables
- ✅ Supabase connection
- ✅ Campaigns table existence
- ✅ Query permissions (RLS)

---

## Common Errors and Solutions

### 1. "Error fetching campaigns: {}"

**Cause:** Error object serialization issue or missing error details.

**Solution:**
- The error handling has been improved to show full error details
- Check the browser console for the enhanced error messages
- Run the diagnostic script to identify the specific issue

---

### 2. "relation 'public.campaigns' does not exist"

**Cause:** The campaigns table hasn't been created in your Supabase database.

**Solution:**
1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Run the `CAMPAIGNS_SCHEMA.sql` file:
   ```sql
   -- Copy and paste the contents of CAMPAIGNS_SCHEMA.sql
   ```
4. Refresh the page and try again

---

### 3. "permission denied for table campaigns" or RLS Policy errors

**Cause:** Row Level Security (RLS) policies are blocking access.

**Solution:**

1. **Ensure you're logged in:**
   - The campaigns feature requires authentication
   - Navigate to `/login` and sign in
   - Then try accessing `/campaigns` again

2. **Verify RLS policies are set up:**
   ```sql
   -- Check if policies exist
   SELECT * FROM pg_policies WHERE tablename = 'campaigns';
   ```

3. **Re-apply the campaign schema:**
   - Run `CAMPAIGNS_SCHEMA.sql` again
   - This will recreate the RLS policies

4. **Check your user role:**
   - Only users with 'Owner' or 'Manager' roles can create/edit campaigns
   - Everyone can view campaigns

---

### 4. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY

**Cause:** Environment variables are missing from `.env.local`.

**Solution:**

1. Create or edit `.env.local` in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Get these values from your Supabase project:
   - Go to Project Settings → API
   - Copy the "Project URL" and "anon/public" key

3. Restart the development server:
   ```bash
   npm run dev
   ```

---

### 5. "Cannot find module 'notification_templates'"

**Cause:** The notification_templates table is missing or the foreign key relationship is broken.

**Solution:**

1. Run the notification templates schema:
   ```bash
   # In Supabase SQL Editor
   # Run NOTIFICATION_TEMPLATES_SCHEMA.sql
   ```

2. Verify the foreign key exists:
   ```sql
   SELECT 
       tc.constraint_name, 
       tc.table_name, 
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name 
   FROM information_schema.table_constraints AS tc 
   JOIN information_schema.key_column_usage AS kcu
       ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name
   WHERE tc.table_name = 'campaigns' 
       AND tc.constraint_type = 'FOREIGN KEY';
   ```

---

## Database Setup Checklist

Ensure these schemas have been applied in order:

- [ ] `NOTIFICATION_TEMPLATES_SCHEMA.sql` - Creates notification templates table
- [ ] `CAMPAIGNS_SCHEMA.sql` - Creates campaigns and campaign_sends tables
- [ ] `CUSTOMER_SEGMENTATION_SCHEMA.sql` - Creates customer segmentation (if using targeted campaigns)

---

## Manual Testing Steps

### 1. Test Supabase Connection
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.from('campaigns').select('count');
console.log('Connection test:', { data, error });
```

### 2. Check Authentication
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user?.email);
```

### 3. Test RLS Policies
```typescript
// Should return data if logged in
const { data, error } = await supabase
  .from('campaigns')
  .select('*')
  .limit(1);
  
console.log('RLS test:', { hasData: !!data, error });
```

---

## Still Having Issues?

1. **Check the browser console** for the enhanced error messages with full details
2. **Run the diagnostic script** to pinpoint the exact issue
3. **Verify all environment variables** are set correctly
4. **Ensure you're authenticated** when accessing campaigns
5. **Check Supabase logs** in your project dashboard under "Logs" → "API"

---

## Need More Help?

- Review the implementation plan: `implementation_plan.md`
- Check Supabase documentation: https://supabase.com/docs
- Verify your database schema matches the SQL files
