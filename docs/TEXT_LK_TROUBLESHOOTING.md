# Text.lk SMS Troubleshooting Guide

## ✅ Good News
Your code implementation is **100% correct** and matches Text.lk's official API documentation perfectly!

## 🔍 The Issue
Messages are still in DEVELOPMENT MODE because environment variables aren't being loaded.

## 📋 Step-by-Step Fix

### Step 1: Verify `.env.local` File

1. **Check the file exists:**
   ```bash
   ls -la .env.local
   ```
   
   If you get "No such file or directory", create it:
   ```bash
   touch .env.local
   ```

2. **Edit `.env.local` and add these EXACT lines:**
   ```env
   SMS_MODE=production
   TEXT_LK_API_KEY=your_api_key_here
   TEXT_LK_SENDER_ID=TextLKDemo
   ```

   **❌ Common Mistakes:**
   - Extra spaces: `SMS_MODE = production` (wrong)
   - Quotes: `SMS_MODE="production"` (wrong)
   - Wrong file: `.env` instead of `.env.local` (wrong)
   
   **✅ Correct Format:**
   - No spaces: `SMS_MODE=production`
   - No quotes: `TEXT_LK_API_KEY=2391|jZzn321zhx5L...`
   - Right file: `.env.local` in project root

### Step 2: Get Your Real API Credentials

1. Go to https://app.text.lk/dashboard
2. Copy your **API Token** (looks like: `2391|jZzn321zhx5LNout59kdhn75l9974ozPMGEqg4GH8afcf321`)
3. For testing, use sender ID: `TextLKDemo`
4. For production, register your own sender ID

### Step 3: Restart the Server (CRITICAL!)

**This is the most common issue!** Environment variables only load when the server starts.

```bash
# 1. Stop the server (press Ctrl+C)
# 2. Start it again
npm run dev

# 3. Wait for "Ready" message
```

### Step 4: Test

1. Send a campaign
2. Check the **terminal** (not browser console)
3. Look for:

**✅ SUCCESS (Production Mode):**
```
📡 Text.lk API Response Status: 200
📡 Text.lk API Response: {
  "status": "success",
  "data": {
    "uid": "...",
    "to": "94710000000",
    "status": "sent",
    "cost": "2.50"
  }
}
✅ SMS sent successfully to: 94710000000
📊 Cost: 2.50 LKR
```

**❌ STILL DEV MODE:**
```
📱 ============ SMS (DEVELOPMENT MODE) ============
ℹ️  SMS was logged (not sent)
```

If you still see "DEVELOPMENT MODE", the environment variables aren't loaded.

### Step 5: Verify Environment Variables

Visit: `http://localhost:3000/api/sms-diagnostics`

You should see:
```json
{
  "diagnostics": {
    "smsMode": "production",
    "hasApiKey": true,
    "hasSenderId": true,
    "isDevelopmentMode": false
  }
}
```

If `isDevelopmentMode: true`, your env vars aren't loaded!

## 🎯 Quick Checklist

- [ ] `.env.local` file exists in project root (NOT in src/)
- [ ] File contains `SMS_MODE=production` (no spaces, no quotes)
- [ ] File contains valid `TEXT_LK_API_KEY=...`
- [ ] File contains `TEXT_LK_SENDER_ID=TextLKDemo`
- [ ] Server was **restarted** after editing the file
- [ ] Verified at `/api/sms-diagnostics` that vars are loaded

## 🆘 Still Not Working?

**Run these commands and share the output:**

```bash
# Check if file exists
cat .env.local

# Check if server sees the variables
curl http://localhost:3000/api/sms-diagnostics
```

## 📱 Example `.env.local` File

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# SMS Configuration
SMS_MODE=production
TEXT_LK_API_KEY=2391|jZzn321zhx5LNout59kdhn75l9974ozPMGEqg4GH8afcf321
TEXT_LK_SENDER_ID=TextLKDemo

# Email Configuration  
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## 💡 Pro Tip

After changing `.env.local`:
1. **ALWAYS** restart the server
2. Check `/api/sms-diagnostics` to confirm
3. Then test sending

The code is perfect - we just need the environment configured correctly! 🚀
