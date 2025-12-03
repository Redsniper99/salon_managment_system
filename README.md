# Salon Management System

A comprehensive salon management system built with Next.js, Supabase, and Tailwind CSS.

## Features

- 📅 **Smart Scheduling**: Drag-and-drop appointments, conflict detection, and stylist availability management.
- 👥 **Staff Management**: Manage stylists, roles, and permissions.
- 💰 **POS & Billing**: Integrated point of sale with receipt generation.
- 📊 **Analytics**: Detailed reports on earnings, staff performance, and customer retention.
- 📱 **Mobile Responsive**: Fully optimized for all devices.
- 🔔 **Notifications**: Email (Resend) and SMS (Text.lk) notifications for appointments and campaigns.
- 📢 **Marketing Campaigns**: Targeted campaigns with customer segmentation.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks & Context
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   - See [RESEND_SETUP.md](./RESEND_SETUP.md) for email configuration
   - See [TEXT_LK_SETUP.md](./TEXT_LK_SETUP.md) for SMS configuration
4. Run development server: `npm run dev`

## Latest Updates
- ✅ Integrated Text.lk SMS gateway for production-ready SMS notifications
- ✅ Dual-platform notification system (Email + SMS)
- ✅ Campaign management with customer segmentation
- Fixed Vercel build issues
- Improved login page design
- Enhanced mobile navigation
