# Enable Production SMS Sending

## Current Status
✅ SMS functionality is working
⚠️ Currently in DEVELOPMENT MODE (messages are logged, not sent)

## To Send Real SMS Messages

### Step 1: Get Text.lk Credentials
1. Go to https://www.text.lk/
2. Sign up or log in
3. Get your:
   - **API Key** (from dashboard)
   - **Sender ID** (your approved sender name)

### Step 2: Update Environment Variables

Open your `.env.local` file and add these lines:

```env
# SMS Configuration - Text.lk
SMS_MODE=production
TEXT_LK_API_KEY=your_actual_api_key_here
TEXT_LK_SENDER_ID=YourSenderID
```

**Example:**
```env
SMS_MODE=production
TEXT_LK_API_KEY=abc123def456ghi789
TEXT_LK_SENDER_ID=MySalon
```

### Step 3: Restart Development Server

After adding the environment variables:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Test

1. Go to Campaigns page
2. Send a test campaign to yourself
3. You should receive a real SMS!

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SMS_MODE` | Yes | Set to `production` to send real SMS |
| `TEXT_LK_API_KEY` | Yes | Your Text.lk API key |
| `TEXT_LK_SENDER_ID` | Yes | Your approved sender ID/name |

---

## Verify It's Working

When `SMS_MODE=production`, you'll see:
```
📱 ============ SMS (PRODUCTION MODE) ============
✅ SMS sent successfully via Text.lk
```

Instead of:
```
📱 ============ SMS (DEVELOPMENT MODE) ============
ℹ️  SMS was logged (not sent)
```

---

## Important Notes

⚠️ **Cost**: Each SMS sent will cost credits from your Text.lk account
⚠️ **Testing**: Test with your own number first before sending to customers
⚠️ **Sender ID**: Must be approved by Text.lk (usually takes 1-2 business days)

---

## Troubleshooting

**Problem**: Still seeing "DEVELOPMENT MODE"
- ✅ Check `.env.local` file exists in project root
- ✅ Verify `SMS_MODE=production` (no quotes, no spaces)
- ✅ Restart the dev server

**Problem**: "Invalid API Key" error
- ✅ Double-check API key is correct (no extra spaces)
- ✅ Ensure API key is active in Text.lk dashboard

**Problem**: SMS not delivered
- ✅ Check phone number format (must be +94XXXXXXXXX)
- ✅ Verify you have Text.lk credits
- ✅ Check if sender ID is approved
