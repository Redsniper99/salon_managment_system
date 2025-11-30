# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - Name: Salon Management System
   - Database Password: (create a strong password)
   - Region: Choose closest to you
5. Wait for the project to be created

## Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2.Open the file `supabase_schema.sql` from your project directory
3. Copy the entire contents
4. Paste into the SQL Editor in Supabase
5. Click "RUN" to execute all the schema creation scripts

This will create:
- All 8 tables (profiles, customers, services, staff, appointments, invoices, promo_codes, branches)
- Row Level Security policies
- Triggers and functions
- Index optimizations
- Sample seed data

## Step 3: Get API Credentials

1. In Supabase dashboard, go to **Settings** > **API**
2. Find these two values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (a long JWT token)

## Step 4: Add Environment Variables

1. Create a file `.env.local` in your project root (same level as `package.json`)
2. Add the following:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

3. Replace the values with your actual Supabase credentials
4. **IMPORTANT**: Do NOT commit `.env.local` to git (it's already in `.gitignore`)

## Step 5: Create Test Users

Since we're now using Supabase Auth, you need to create users in Supabase:

1. In Supabase dashboard, go to **Authentication** > **Users**
2. Click "Add User"
3. Create test users with these details:

**Owner Account:**
- Email: `owner@salonflow.com`
- Password: `owner123`

After creating the user in Auth:
1. Copy the User ID (UUID)
2. Go to **SQL Editor**
3. Run this query to create the profile:

```sql
INSERT INTO profiles (id, email, name, role, is_active)
VALUES 
  ('paste-user-id-here', 'owner@salonflow.com', 'John Owner', 'Owner', true);
```

Repeat for other test users (Manager, Receptionist, Stylist) if needed.

## Step 6: Test the Connection

1. Restart your Next.js dev server:
   ```bash
   npm run dev
   ```

2. Try logging in with one of your test users
3. Check the browser console for any connection errors

## Troubleshooting

**If login doesn't work:**
- Check that environment variables are correct
- Verify the user exists in both `auth.users` and `profiles` tables
- Check browser console for detailed error messages
- Ensure RLS policies are active (they allow authenticated users to read data)

**If you see "Missing Supabase environment variables":**
- Restart your dev server after adding `.env.local`
- Verify the file is in the project root
- Check that variable names start with `NEXT_PUBLIC_`
