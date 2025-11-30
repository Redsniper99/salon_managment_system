import { supabase } from '@/lib/supabase';
import { notificationsService } from './notifications';
import { segmentationService } from './segmentation';

interface Campaign {
    id: string;
    name: string;
    description?: string;
    template_id: string;
    target_segments: string[];
    scheduled_for?: string;
    status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed';
    channel: 'sms' | 'email' | 'both';
    target_count: number;
    sent_count: number;
    delivered_count: number;
    failed_count: number;
    estimated_cost: number;
    actual_cost: number;
    created_at: string;
    sent_at?: string;
    completed_at?: string;
}

export const campaignService = {
    /**
     * Get all campaigns
     */
    async getCampaigns() {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select(`
                    *,
                    notification_templates (name, message)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            throw error;
        }
    },

    /**
     * Get campaign by ID
     */
    async getCampaignById(id: string) {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select(`
                    *,
                    notification_templates (*),
                    campaign_sends (*)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching campaign:', error);
            throw error;
        }
    },

    /**
     * Preview audience for selected segments
     */
    async previewAudience(segments: string[], channel: 'sms' | 'email' | 'both') {
        try {
            if (!segments || segments.length === 0) {
                return { count: 0, estimatedCost: 0, customers: [] };
            }

            // Get customers that match any of the selected segments
            const { data: customers, error } = await supabase
                .from('customers')
                .select('id, name, email, phone, segment_tags')
                .overlaps('segment_tags', segments)
                .eq('is_active', true);

            if (error) throw error;

            // Filter by channel availability
            let filteredCustomers = customers || [];

            if (channel === 'email') {
                filteredCustomers = filteredCustomers.filter(c => c.email);
            } else if (channel === 'sms') {
                filteredCustomers = filteredCustomers.filter(c => c.phone);
            } else if (channel === 'both') {
                filteredCustomers = filteredCustomers.filter(c => c.email || c.phone);
            }

            const count = filteredCustomers.length;
            const costPerMessage = 2; // LKR per SMS/Email
            const estimatedCost = count * costPerMessage;

            return {
                count,
                estimatedCost,
                customers: filteredCustomers
            };
        } catch (error) {
            console.error('Error previewing audience:', error);
            console.error('Segments:', segments);
            console.error('Full Error:', JSON.stringify(error, null, 2));
            throw error;
        }
    },

    /**
     * Create new campaign
     */
    async createCampaign(campaign: {
        name: string;
        description?: string;
        template_id: string;
        target_segments: string[];
        scheduled_for?: string;
        channel: 'sms' | 'email' | 'both';
    }) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Get audience preview for stats
            const preview = await this.previewAudience(campaign.target_segments, campaign.channel);

            const { data, error } = await supabase
                .from('campaigns')
                .insert({
                    ...campaign,
                    status: campaign.scheduled_for ? 'scheduled' : 'draft',
                    target_count: preview.count,
                    estimated_cost: preview.estimatedCost,
                    created_by: user?.id
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating campaign:', error);
            throw error;
        }
    },

    /**
     * Update campaign
     */
    async updateCampaign(id: string, updates: Partial<Campaign>) {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating campaign:', error);
            throw error;
        }
    },

    /**
     * Delete campaign
     */
    async deleteCampaign(id: string) {
        try {
            const { error } = await supabase
                .from('campaigns')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting campaign:', error);
            throw error;
        }
    },

    /**
     * Send campaign immediately
     */
    async sendCampaignNow(campaignId: string) {
        try {
            // Get campaign details
            const campaign = await this.getCampaignById(campaignId);
            if (!campaign) throw new Error('Campaign not found');

            // Update status to sending
            await this.updateCampaign(campaignId, { status: 'sending', sent_at: new Date().toISOString() });

            // Get target customers
            const { customers } = await this.previewAudience(campaign.target_segments, campaign.channel);

            console.log(`📤 Sending campaign to ${customers.length} customers...`);

            // Send to each customer
            for (const customer of customers) {
                try {
                    // Create campaign send record
                    const { data: sendRecord } = await supabase
                        .from('campaign_sends')
                        .insert({
                            campaign_id: campaignId,
                            customer_id: customer.id,
                            channel: campaign.channel,
                            status: 'pending'
                        })
                        .select()
                        .single();

                    // Send notification using template
                    await notificationsService.sendNotification(
                        customer.id,
                        campaign.notification_templates.type,
                        {
                            customer_name: customer.name,
                            date: new Date().toLocaleDateString(),
                            time: new Date().toLocaleTimeString()
                        }
                    );

                    // Update send record as sent
                    await supabase
                        .from('campaign_sends')
                        .update({
                            status: 'sent',
                            sent_at: new Date().toISOString()
                        })
                        .eq('id', sendRecord.id);

                } catch (error) {
                    console.error(`Failed to send to customer ${customer.id}:`, error);

                    // Record failure
                    await supabase
                        .from('campaign_sends')
                        .update({
                            status: 'failed',
                            error_message: error instanceof Error ? error.message : 'Unknown error'
                        })
                        .eq('campaign_id', campaignId)
                        .eq('customer_id', customer.id);
                }
            }

            // Update campaign status to completed
            await this.updateCampaign(campaignId, {
                status: 'completed',
                completed_at: new Date().toISOString()
            });

            // Stats are automatically updated by trigger
            console.log('✅ Campaign sent successfully!');

            return { success: true };
        } catch (error) {
            console.error('Error sending campaign:', error);

            // Update campaign status to failed
            await this.updateCampaign(campaignId, { status: 'failed' });

            throw error;
        }
    },

    /**
     * Cancel scheduled campaign
     */
    async cancelCampaign(id: string) {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .update({ status: 'cancelled' })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error cancelling campaign:', error);
            throw error;
        }
    }
};
