# Create Test Users in Supabase

## Quick Setup Guide

You've successfully configured your Supabase credentials! Now let's create test users.

### Step 1: Create Users in Supabase Auth

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project: **Salon Management System**
3. Navigate to **Authentication** → **Users** (in the left sidebar)
4. Click **"Add User"** button

### Step 2: Create Owner Account

Fill in the form:
- **Email**: `owner@salonflow.com`
- **Password**: `owner123`
- **Auto Confirm User**: ✅ Check this box

Click "Create User"

**IMPORTANT**: After the user is created, copy the **User ID** (it's a UUID like `1234abcd-5678-efgh-...`)

### Step 3: Create Profile for Owner

1. Go to **SQL Editor** in Supabase
2. Paste this SQL (replace `USER_ID_HERE` with the actual UUID you copied):

```sql
INSERT INTO profiles (id, email, name, role, is_active)
VALUES 
  ('USER_ID_HERE', 'owner@salonflow.com', 'John Owner', 'Owner', true);
```

3. Click "RUN"

### Step 4: Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C in the terminal)
# Then restart it:
npm run dev
```

### Step 5: Test Login

1. Open http://localhost:3000
2. Login with:
   - Email: `owner@salonflow.com`
   - Password: `owner123`

You should be redirected to the dashboard!

---

## Optional: Create Additional Test Users

Repeat Steps 2-3 for these accounts:

**Manager:**
```sql
-- First create in Auth UI with email: manager@salonflow.com, password: manager123
-- Then run this SQL:
INSERT INTO profiles (id, email, name, role, is_active)
VALUES 
  ('MANAGER_USER_ID', 'manager@salonflow.com', 'Sarah Manager', 'Manager', true);
```

**Stylist:**
```sql
-- First create in Auth UI with email: stylist@salonflow.com, password: stylist123
-- Then run this SQL:
INSERT INTO profiles (id, email, name, role, is_active)
VALUES 
  ('STYLIST_USER_ID', 'stylist@salonflow.com', 'Mike Stylist', 'Stylist', true);
```

---

## Troubleshooting

**"Invalid login credentials"**
- Make sure you created the user in Supabase Auth
- Verify the profile was inserted into the `profiles` table
- Check that user IDs match between auth.users and profiles

**"Error fetching user profile"**
- Go to SQL Editor and run: `SELECT * FROM profiles;`
- Verify your profile exists
- Check RLS policies are enabled

**Environment variables not loading**
- Restart the dev server completely (Ctrl+C, then `npm run dev`)
- Verify `.env.local` exists in project root
- Check there are no typos in variable names
