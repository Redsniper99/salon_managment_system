#!/bin/bash

echo "🔍 Email Troubleshooting Diagnostic"
echo "===================================="
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "✅ .env.local file exists"
    
    # Check for RESEND_API_KEY (without showing the actual key)
    if grep -q "RESEND_API_KEY=" .env.local; then
        echo "✅ RESEND_API_KEY is set"
    else
        echo "❌ RESEND_API_KEY is NOT set"
        echo "   Add it to .env.local: RESEND_API_KEY=re_xxxxx"
    fi
    
    # Check NODE_ENV
    if grep -q "NODE_ENV=" .env.local; then
        NODE_ENV_VALUE=$(grep "NODE_ENV=" .env.local | cut -d '=' -f2)
        echo "✅ NODE_ENV is set to: $NODE_ENV_VALUE"
    else
        echo "⚠️  NODE_ENV not set in .env.local (will use system default)"
    fi

    # Check RESEND_FROM_EMAIL
    if grep -q "RESEND_FROM_EMAIL=" .env.local; then
        FROM_EMAIL=$(grep "RESEND_FROM_EMAIL=" .env.local | cut -d '=' -f2)
        echo "✅ RESEND_FROM_EMAIL is set to: $FROM_EMAIL"
        
        if [[ "$FROM_EMAIL" == *"onboarding@resend.dev"* ]]; then
            echo "❌ WARNING: RESEND_FROM_EMAIL is using the default 'onboarding@resend.dev'"
            echo "   You MUST change this to your verified domain email (e.g., appointments@yourdomain.com)"
        fi
    else
        echo "❌ RESEND_FROM_EMAIL is NOT set"
        echo "   You are likely using the default 'onboarding@resend.dev' which restricts recipients."
        echo "   Add to .env.local: RESEND_FROM_EMAIL=\"Your Name <mail@yourdomain.com>\""
    fi
else
    echo "❌ .env.local file not found"
fi

echo ""
echo "===================================="
echo "Next Steps:"
echo "1. Make sure RESEND_API_KEY is set in .env.local"
echo "2. Restart server with: NODE_ENV=production npm run dev"
echo "3. Check terminal output when sending email"
echo "4. Check spam folder in manjulaprashan739@gmail.com"
echo "===================================="
