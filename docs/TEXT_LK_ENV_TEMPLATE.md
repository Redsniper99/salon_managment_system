# Text.lk SMS Gateway Integration - Environment Variables Template

Copy these variables to your `.env.local` file and fill in your Text.lk credentials.

```env
# ============================================
# TEXT.LK SMS GATEWAY CONFIGURATION
# ============================================

# Text.lk API Key
# Get this from: https://www.text.lk/dashboard → Settings → API Keys
TEXT_LK_API_KEY=your_api_key_here

# Text.lk Sender ID (what recipients see as sender)
# Register at: https://www.text.lk/dashboard → Settings → Sender IDs
# For testing only, you can use: TextLKDemo
# For production, use your approved Sender ID
TEXT_LK_SENDER_ID=YourSenderID

# SMS Mode
# - Leave unset or set to 'development' for testing (logs to console, doesn't send)
# - Set to 'production' to send real SMS messages
# SMS_MODE=development
SMS_MODE=production
```

## Quick Start

### For Development/Testing (No SMS Sent)
```env
# Optional in dev mode - can be dummy values
TEXT_LK_API_KEY=test_key
TEXT_LK_SENDER_ID=TestSender

# Leave SMS_MODE unset or set to development
# SMS_MODE=development
```

### For Production (Real SMS)
```env
# Required - Get from Text.lk dashboard
TEXT_LK_API_KEY=your_actual_api_key_from_textlk
TEXT_LK_SENDER_ID=YourApprovedSenderID

# Required for production
SMS_MODE=production
```

## Complete Example

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Resend Email
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL="SalonFlow <noreply@yourdomain.com>"
EMAIL_MODE=production

# Text.lk SMS
TEXT_LK_API_KEY=your_text_lk_api_key_here
TEXT_LK_SENDER_ID=MySalon
SMS_MODE=production
```

## Need Help?

See [TEXT_LK_SETUP.md](./TEXT_LK_SETUP.md) for detailed setup instructions.
