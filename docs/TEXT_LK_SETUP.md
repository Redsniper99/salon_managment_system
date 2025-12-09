# Text.lk SMS Gateway Setup Guide

This guide will help you configure the Text.lk SMS gateway for your salon management system.

## Prerequisites

1. **Text.lk Account**: Sign up at [https://www.text.lk](https://www.text.lk)
2. **API Key**: Obtain from Text.lk dashboard
3. **Sender ID**: Register and get approval for your custom Sender ID

## Environment Variables

Add the following variables to your `.env.local` file:

```env
# Text.lk SMS Gateway Configuration
TEXT_LK_API_KEY=your_api_key_here
TEXT_LK_SENDER_ID=YourSenderID

# SMS Mode: Set to 'production' to send real SMS, leave unset for development mode
SMS_MODE=development
```

### Getting Your API Key

1. Log in to your Text.lk dashboard at [https://www.text.lk/dashboard](https://www.text.lk/dashboard)
2. Navigate to **Settings** → **API Keys**
3. Create a new API key or copy your existing one
4. Add it to your `.env.local` file as `TEXT_LK_API_KEY`

### Registering a Sender ID

A Sender ID is what recipients see as the sender name (e.g., "MySalon").

1. Go to **Settings** → **Sender IDs** in your Text.lk dashboard
2. Click **Register New Sender ID**
3. Enter your desired Sender ID (alphanumeric, max 11 characters)
4. Wait for approval (usually within 24 hours)
5. Once approved, add it to your `.env.local` as `TEXT_LK_SENDER_ID`

> **For Testing Only**: You can use `TEXT_LK_SENDER_ID="TextLKDemo"` for testing purposes, but this must be changed for production use.

## Environment Variable Examples

### Development Mode (Default)
SMS messages will be logged to console instead of being sent:

```env
# Text.lk credentials (optional in dev mode)
TEXT_LK_API_KEY=your_api_key_here
TEXT_LK_SENDER_ID=TextLKDemo

# Leave SMS_MODE unset or set to 'development'
# SMS_MODE=development
```

### Production Mode
Real SMS messages will be sent via Text.lk:

```env
# Text.lk credentials (required)
TEXT_LK_API_KEY=your_actual_api_key
TEXT_LK_SENDER_ID=YourApprovedSenderID

# Set SMS_MODE to production
SMS_MODE=production
```

## Complete .env.local Example

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Resend Email Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL="SalonFlow <noreply@yourdomain.com>"
EMAIL_MODE=production

# Text.lk SMS Configuration
TEXT_LK_API_KEY=your_text_lk_api_key
TEXT_LK_SENDER_ID=YourSenderID
SMS_MODE=production
```

## Testing the Integration

### 1. Development Mode Testing

Start your server and create a campaign with SMS channel:

```bash
npm run dev
```

1. Go to **Campaigns** → **New Campaign**
2. Select **SMS** or **Both** as the channel
3. Select target segments
4. Send the campaign
5. Check your terminal console for SMS logs

You should see output like:
```
📱 ============ SMS (DEVELOPMENT MODE) ============
📞 To: +94771234567
💬 Message: Your promotional message here
======================================================
ℹ️  SMS was logged (not sent). Set SMS_MODE=production to send real SMS.
```

### 2. Production Mode Testing

⚠️ **Warning**: This will send real SMS and consume credits.

1. Ensure you have credits in your Text.lk account
2. Set `SMS_MODE=production` in `.env.local`
3. Restart your development server
4. Send a test campaign to your own phone number first
5. Verify receipt of the SMS

## Phone Number Format

The system automatically normalizes phone numbers to Sri Lankan format:

- **Input formats accepted**:
  - `0771234567` → normalized to `94771234567`
  - `+94771234567` → normalized to `94771234567`
  - `94771234567` → stays as `94771234567`

- **Valid format**: `94` followed by 9 digits

## Pricing

Text.lk pricing starts at **LKR 0.64 per SMS** (as of Dec 2023). Check your dashboard for current pricing and account balance.

## Troubleshooting

### Error: "Text.lk credentials not configured"

**Solution**: Add `TEXT_LK_API_KEY` and `TEXT_LK_SENDER_ID` to your `.env.local` file and restart the server.

### Error: "Invalid phone number format"

**Solution**: Ensure phone numbers are in valid Sri Lankan format (starts with 0 or +94, followed by 9 digits).

### Error: "Insufficient balance" or "Low credits"

**Solution**:
1. Go to [https://www.text.lk/dashboard](https://www.text.lk/dashboard)
2. Navigate to **Account** → **Add Credits**
3. Top up your account
4. Try sending again

### Error: "Sender ID not approved" or "Invalid Sender ID"

**Solution**:
1. Verify your Sender ID is approved in Text.lk dashboard
2. Check that `TEXT_LK_SENDER_ID` matches exactly (case-sensitive)
3. For testing, use `TEXT_LK_SENDER_ID="TextLKDemo"`

### SMS not being sent in production

**Checklist**:
- [ ] `SMS_MODE=production` is set in `.env.local`
- [ ] Server has been restarted after adding environment variables
- [ ] Text.lk API key is valid and not expired
- [ ] Account has sufficient credits
- [ ] Sender ID is approved
- [ ] Phone number is in valid format

## Switching Between Email and SMS

The campaign system supports three channels:

1. **Email Only**: Uses Resend service
2. **SMS Only**: Uses Text.lk service  
3. **Both**: Sends via both Email (Resend) and SMS (Text.lk)

Recipients must have:
- Valid email address for email channel
- Valid phone number for SMS channel
- Either or both for "both" channel

## Cost Management

- **Preview before sending**: The campaign creation wizard shows estimated cost based on recipient count
- **Monitor usage**: Check Text.lk dashboard regularly for usage statistics
- **Set up alerts**: Configure low balance alerts in Text.lk dashboard

## Support

- **Text.lk Support**: [https://www.text.lk/contact](https://www.text.lk/contact)
- **API Documentation**: [https://www.text.lk/docs/sms-api](https://www.text.lk/docs/sms-api)
- **Dashboard**: [https://www.text.lk/dashboard](https://www.text.lk/dashboard)

## Next Steps

1. ✅ Configure environment variables
2. ✅ Test in development mode
3. ✅ Register and get Sender ID approved
4. ✅ Add credits to account
5. ✅ Test in production mode with your own number
6. ✅ Monitor first few campaigns closely
7. ✅ Set up usage alerts
