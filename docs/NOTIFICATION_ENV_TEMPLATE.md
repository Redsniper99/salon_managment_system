# Environment Variables - Simplified Setup

## Required for Notifications

Add to your `.env.local` file:

```bash
# Resend (Email) - ACTUALLY SENDS EMAILS
RESEND_API_KEY=re_jg5fpcmQ_3tCfhcW4gpw6vc2gD7osbNwb
```

## That's It!

✅ **Email notifications**: Will actually send via Resend
✅ **SMS notifications**: Will log to console (demo mode)

## How It Works

### Email (Resend):
- Actually sends real emails
- 3,000 emails/month free
- From: `SalonFlow <onboarding@resend.dev>`
- To: Customer email from database

### SMS (Console Mock):
- Logs SMS content to browser console
- Shows phone number and message
- Demonstrates functionality without actual sending
- Perfect for demo!

## Testing

1. **Restart your dev server**:
   ```bash
   npm run dev
   ```

2. **Test Email**:
   - Go to Notifications page
   - Create template with channel: "Email"
   - Send notification
   - Check your inbox! 📧

3. **Test SMS**:
   - Create template with channel: "SMS"
   - Send notification
   - Open browser console (F12)
   - See the SMS message logged there! 📱

## Why This Works Better for Demo

✅ **No Twilio complications** - No trial limitations
✅ **No phone verification** needed
✅ **Shows SMS works** - Console shows what would be sent
✅ **Real emails work** - Proves integration capability
✅ **100% FREE** - No credits needed

Perfect for demonstrating the notification system! 🎉
