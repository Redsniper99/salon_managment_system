# Resend Email Setup Guide

This guide explains how to set up email functionality for both development and production environments.

## Current Setup

You have **two modes** for email sending:

### 🛠️ Development Mode (Default)
- **Behavior:** Emails are logged to the console (not actually sent)
- **Use Case:** Testing email content and campaign functionality
- **Requirements:** None - works out of the box
- **How to Enable:** This is the default when `NODE_ENV` is not set to `production`

### 🚀 Production Mode
- **Behavior:** Real emails are sent via Resend
- **Use Case:** Sending actual emails to customers
- **Requirements:** Verified domain on Resend
- **How to Enable:** Set `NODE_ENV=production`

---

## Development Mode (Testing)

Perfect for testing without sending real emails!

### How It Works

When you send a campaign or notification in development mode, you'll see output like this in your terminal:

```
📧 ============ EMAIL (DEVELOPMENT MODE) ============
📬 To: customer@example.com
📝 Subject: Appointment Confirmation
💌 HTML Content:
<p>Hi John,<br><br>Your appointment has been confirmed!...</p>
=======================================================
ℹ️  Email was logged (not sent). Set NODE_ENV=production to send real emails.
ℹ️  For production: Verify your domain at https://resend.com/domains
=======================================================
```

### Advantages
- ✅ No domain verification needed
- ✅ Test email content safely
- ✅ No risk of sending to real customers by mistake
- ✅ See full email content and formatting
- ✅ Works immediately

---

## Production Mode Setup

To send **real emails** to customers, follow these steps:

### Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up or log in
3. You should already have a `RESEND_API_KEY` (check your `.env.local`)

### Step 2: Verify Your Domain

> [!IMPORTANT]
> You **must** verify a domain to send emails to anyone other than yourself.

#### Option A: Use Your Own Domain

1. Go to https://resend.com/domains
2. Click **"Add Domain"**
3. Enter your domain (e.g., `mysalon.com`)
4. Add the DNS records Resend provides to your domain's DNS settings:
   - `MX` record
   - `TXT` records for SPF and DKIM
5. Wait for verification (usually takes a few minutes to 24 hours)

#### Option B: Use a Subdomain (Recommended)

1. Go to https://resend.com/domains
2. Click **"Add Domain"**
3. Enter a subdomain like `mail.mysalon.com` or `notifications.mysalon.com`
4. Add the DNS records to your domain provider
5. Wait for verification

### Step 3: Configure Environment Variables

Once your domain is verified, update your `.env.local`:

```env
# Email Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL="SalonFlow <noreply@yourdomain.com>"

# Important: Use your verified domain in the email address above
```

**Examples of valid `RESEND_FROM_EMAIL` values:**
```env
RESEND_FROM_EMAIL="SalonFlow <hello@mysalon.com>"
RESEND_FROM_EMAIL="My Salon <noreply@mail.mysalon.com>"
RESEND_FROM_EMAIL="Appointment Notifications <appointments@mysalon.com>"
```

### Step 4: Enable Production Mode

When deploying to production (Vercel, etc.):

1. **Vercel:** Environment variables are automatically set to production
2. **Local testing:** Set in your command:
   ```bash
   NODE_ENV=production npm run dev
   ```

### Step 5: Restart Your Server

After updating environment variables:
```bash
# Stop the server (Ctrl+C)
# Restart
npm run dev
```

---

## Troubleshooting

### Error: "You can only send testing emails to your own email address"

**Cause:** Using the default `onboarding@resend.dev` email without a verified domain.

**Solution:** Either:
1. **For testing:** Keep development mode (no `NODE_ENV=production`)
2. **For production:** Follow the "Production Mode Setup" steps above

---

### Error: "RESEND_API_KEY not configured"

**Cause:** Missing API key in `.env.local`

**Solution:**
1. Get your API key from https://resend.com/api-keys
2. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
   ```
3. Restart the server

---

### Emails Are Being Logged But Not Sent

**Cause:** You're in development mode

**Solution:** 
- This is expected behavior for safety
- To test production mode locally:
  ```bash
  NODE_ENV=production npm run dev
  ```
- Make sure you've verified a domain first!

---

### Domain Verification Taking Too Long

DNS propagation can take time. To check:

1. Go to https://resend.com/domains
2. Check the status of your domain
3. Click "Verify" to manually trigger a check
4. If still pending after 24 hours, check DNS records with:
   ```bash
   dig MX yourdomain.com
   dig TXT yourdomain.com
   ```

---

## Quick Reference

| Environment | NODE_ENV | Email Behavior | Domain Needed? |
|-------------|----------|----------------|----------------|
| Development | `development` or not set | Logged to console | ❌ No |
| Production  | `production` | Sent via Resend | ✅ Yes |

### Environment Variables

```env
# Required for both modes
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Required for production mode only
RESEND_FROM_EMAIL="YourApp <noreply@yourdomain.com>"

# Optional - explicitly set mode
NODE_ENV=development  # or production
```

---

## Testing Your Setup

### Test Development Mode
```bash
# Make sure NODE_ENV is not set to production
npm run dev

# Send a test campaign
# Check terminal for email log output
```

### Test Production Mode
```bash
# Set production mode
NODE_ENV=production npm run dev

# Send to your own email first
# Check your inbox
```

---

## Best Practices

1. **Always test in development mode first** before enabling production
2. **Use a subdomain for emails** (e.g., `mail.yourdomain.com`)
3. **Keep the from address consistent** for better email deliverability
4. **Monitor Resend dashboard** for bounce rates and analytics
5. **Start with small test groups** before sending mass campaigns

---

## Support

- **Resend Documentation:** https://resend.com/docs
- **DNS Setup Help:** https://resend.com/docs/dashboard/domains/introduction
- **Resend Support:** support@resend.com
