# How to Clear All System Data

This guide explains how to reset your salon management system to start fresh with empty tables.

## ⚠️ WARNING

**This will delete ALL data including:**
- All customers
- All appointments
- All invoices
- All campaigns
- All services
- All staff members
- All customer segments
- All notifications

**This will NOT delete:**
- Database schema/structure
- RLS policies
- User authentication accounts
- Application code

## 📋 Prerequisites

Before clearing data:

1. ✅ **Backup Important Data**: If you have any data you want to keep, export it first
2. ✅ **Confirm You Want Fresh Start**: This action cannot be easily undone
3. ✅ **Access to Supabase Dashboard**: You'll need your Supabase project access

## 🚀 Step-by-Step Instructions

### Method 1: Using Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Run Script**
   - Open [CLEAR_ALL_DATA.sql](file:///Users/manjulaprashan/Desktop/Personal%20Projects/salon_managment_system/CLEAR_ALL_DATA.sql)
   - Copy the entire script
   - Paste into the SQL Editor
   - Click **"Run"** button

4. **Verify Results**
   - Check the query results at the bottom
   - All row counts should be 0
   - You should see:
     ```
     ✅ All system data has been cleared successfully!
     📝 Database structure and policies remain intact
     🚀 Ready for fresh data entry
     ```

5. **Refresh Your Application**
   - Go back to your salon management app
   - Refresh the page
   - All pages should show empty states

### Method 2: Table-by-Table (Manual)

If you prefer to delete data from specific tables only:

1. Go to Supabase → **Table Editor**
2. Select the table you want to clear
3. Click on the table settings (three dots)
4. Select **"Delete all rows"**
5. Confirm the deletion

**Order to delete (to respect foreign keys):**
1. campaign_sends
2. campaigns
3. invoice_items
4. invoices
5. appointments
6. services
7. staff
8. customers

## 🔧 What Gets Reset

After running the script:

| Component | Status |
|-----------|--------|
| Customer records | ✅ Deleted |
| Appointments | ✅ Deleted |
| Invoices & Payments | ✅ Deleted |
| Services & Pricing | ✅ Deleted |
| Staff members | ✅ Deleted |
| Campaigns | ✅ Deleted |
| Customer segments | ✅ Deleted |
| Database structure | ❌ Preserved |
| RLS policies | ❌ Preserved |
| Notification templates | ✅ Deleted |
| User accounts (auth) | ❌ Preserved |

## 🔐 Keeping User Accounts

The script does NOT delete user authentication accounts. To delete those too:

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Manually delete each user account
3. Or keep admin accounts and delete only test users

## ✨ After Clearing Data

Your application will:

1. ✅ Show all empty states (no customers, no appointments, etc.)
2. ✅ Be ready to accept new data
3. ✅ All features still work normally
4. ✅ No errors or broken functionality

**First things to add:**

1. **Services**: Go to `/services` and add your salon services
2. **Staff**: Go to `/staff` and add stylists
3. **Customers**: Go to `/customers` and add customers
4. **Notification Templates**: Go to `/notifications` and create templates

## 🎯 Use Cases

**When to use this script:**

1. ✅ Moving from testing to production
2. ✅ Starting a new salon setup
3. ✅ Clearing test/demo data
4. ✅ Resetting after training
5. ✅ Fresh start after system issues

**When NOT to use:**

1. ❌ Production system with real customer data
2. ❌ If you only want to delete specific records
3. ❌ Without proper backup of important data

## 🆘 Troubleshooting

### Error: "Foreign key constraint violation"

**Solution**: The script is ordered correctly to respect foreign keys. If you see this error, you may have custom tables. Delete dependent tables first.

### Error: "Permission denied"

**Solution**: Make sure you're connected to the correct Supabase project and have admin access.

### Some tables still have data

**Solution**: 
1. Check the verification query results at the end of the script
2. Some tables might not be in the script (custom tables)
3. Run individual DELETE statements for those tables

### Want to keep specific data

**Solution**:
1. Don't run the full script
2. Comment out the DELETE statements for tables you want to keep
3. Or use Method 2 to delete table-by-table

## 📞 Support

If you encounter issues:

1. Check Supabase dashboard for error messages
2. Verify you have admin privileges
3. Review the SQL execution log
4. Check if RLS policies are blocking deletions

## ⚡ Quick Reference

```bash
# Open Supabase Dashboard
https://supabase.com/dashboard

# Navigate to SQL Editor
Dashboard → SQL Editor → New Query

# Paste and Run
CLEAR_ALL_DATA.sql → Run

# Verify
Check row counts = 0

# Refresh App
Your application → Hard refresh (Cmd+Shift+R)
```

---

**Remember**: Always backup important data before running destructive operations!
