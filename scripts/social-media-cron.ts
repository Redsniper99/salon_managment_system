import cron from 'node-cron';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '';

console.log('🚀 Social Media Story Automation Cron Started');
console.log(`📡 Targeting: ${APP_URL}/api/social-media/automation`);

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🕒 Checking for scheduled stories...`);

    try {
        const response = await fetch(`${APP_URL}/api/social-media/automation`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CRON_SECRET}`
            }
        });

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            console.log(`✅ Processed ${data.results.length} stories.`);
            console.table(data.results.map((r: any) => ({
                id: r.id,
                status: r.status,
                error: r.error || 'none'
            })));
        } else if (data.message) {
            console.log(`ℹ️ ${data.message}`);
        } else {
            console.log('⚠️ Unexpected response:', data);
        }
    } catch (error: any) {
        console.error('❌ Error calling automation API:', error.message);
    }
});

// Run once on startup
(async () => {
    console.log('🎬 Initializing first check...');
    try {
        await fetch(`${APP_URL}/api/social-media/automation`);
    } catch (e) { }
})();
