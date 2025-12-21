import { supabase } from '@/lib/supabase';

// Types
export interface SocialMediaSettings {
    id: string;
    facebook_page_id: string | null;
    facebook_page_token: string | null;
    instagram_account_id: string | null;
    is_connected: boolean;
    facebook_enabled: boolean;
    instagram_enabled: boolean;
    logo_url: string | null;
    logo_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    logo_size: number;
    last_automation_run: string | null;
    created_at: string;
    updated_at: string;
}

export interface CaptionTemplate {
    id: string;
    name: string;
    caption: string;
    hashtags: string | null;
    is_active: boolean;
    created_at: string;
}

export interface StorySchedule {
    id: string;
    enabled: boolean;
    posting_days: string[];
    daily_post_limit: number;
    created_at: string;
    updated_at: string;
}

export interface PostingSlot {
    id: string;
    slot_order: number;
    posting_time: string;
    caption_template_id: string | null;
    custom_caption: string | null;
    is_active: boolean;
    created_at: string;
    caption_template?: CaptionTemplate;
}

export interface StoryImage {
    id: string;
    image_url: string;
    processed_url: string | null;
    caption: string | null;
    caption_template_id: string | null;
    use_slot_caption: boolean;
    status: 'pending' | 'processing' | 'posted' | 'failed';
    scheduled_date: string | null;
    scheduled_time: string | null;
    slot_id: string | null;
    posted_at: string | null;
    facebook_post_id: string | null;
    instagram_post_id: string | null;
    error_message: string | null;
    created_at: string;
    caption_template?: CaptionTemplate;
    slot?: PostingSlot;
}

export const socialMediaService = {
    // ============ SETTINGS ============

    async getSettings(): Promise<SocialMediaSettings | null> {
        const { data, error } = await supabase
            .from('social_media_settings')
            .select('*')
            .maybeSingle();

        if (error) {
            console.error('Error fetching social media settings:', error);
            throw error;
        }

        return data;
    },

    async updateSettings(updates: Partial<SocialMediaSettings>): Promise<SocialMediaSettings> {
        // Check if settings exist
        const existing = await this.getSettings();

        if (existing) {
            const { data, error } = await supabase
                .from('social_media_settings')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('social_media_settings')
                .insert(updates)
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    // ============ CAPTION TEMPLATES ============

    async getCaptionTemplates(): Promise<CaptionTemplate[]> {
        const { data, error } = await supabase
            .from('caption_templates')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        return data || [];
    },

    async createCaptionTemplate(template: { name: string; caption: string; hashtags?: string | null }): Promise<CaptionTemplate> {
        const { data, error } = await supabase
            .from('caption_templates')
            .insert(template)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateCaptionTemplate(id: string, updates: Partial<CaptionTemplate>): Promise<CaptionTemplate> {
        const { data, error } = await supabase
            .from('caption_templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCaptionTemplate(id: string): Promise<void> {
        const { error } = await supabase
            .from('caption_templates')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
    },

    // ============ SCHEDULE ============

    async getSchedule(): Promise<StorySchedule | null> {
        const { data, error } = await supabase
            .from('story_schedule')
            .select('*')
            .maybeSingle();

        if (error) {
            console.error('Error fetching schedule:', error);
            throw error;
        }

        return data;
    },

    async updateSchedule(updates: Partial<StorySchedule>): Promise<StorySchedule> {
        const existing = await this.getSchedule();

        if (existing) {
            const { data, error } = await supabase
                .from('story_schedule')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('story_schedule')
                .insert(updates)
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    // ============ POSTING SLOTS ============

    async getPostingSlots(): Promise<PostingSlot[]> {
        const { data, error } = await supabase
            .from('posting_slots')
            .select(`
                *,
                caption_template:caption_templates(*)
            `)
            .eq('is_active', true)
            .order('slot_order');

        if (error) throw error;
        return data || [];
    },

    async createPostingSlot(slot: { posting_time: string; caption_template_id?: string | null; custom_caption?: string | null }): Promise<PostingSlot> {
        // Get the max slot_order
        const slots = await this.getPostingSlots();
        const maxOrder = slots.length > 0 ? Math.max(...slots.map(s => s.slot_order)) : 0;

        const { data, error } = await supabase
            .from('posting_slots')
            .insert({ ...slot, slot_order: maxOrder + 1 })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePostingSlot(id: string, updates: Partial<PostingSlot>): Promise<PostingSlot> {
        const { data, error } = await supabase
            .from('posting_slots')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deletePostingSlot(id: string): Promise<void> {
        const { error } = await supabase
            .from('posting_slots')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
    },

    // ============ STORY IMAGES ============

    async getStoryImages(status?: string): Promise<StoryImage[]> {
        let query = supabase
            .from('story_images')
            .select(`
                *,
                caption_template:caption_templates(*),
                slot:posting_slots(*)
            `)
            .order('created_at', { ascending: true });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getQueuedImages(): Promise<StoryImage[]> {
        return this.getStoryImages('pending');
    },

    async addStoryImage(image: {
        image_url: string;
        processed_url?: string;
        caption?: string;
        caption_template_id?: string;
        use_slot_caption?: boolean;
    }): Promise<StoryImage> {
        const { data, error } = await supabase
            .from('story_images')
            .insert({
                ...image,
                status: 'pending',
                use_slot_caption: image.use_slot_caption ?? true
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateStoryImage(id: string, updates: Partial<StoryImage>): Promise<StoryImage> {
        const { data, error } = await supabase
            .from('story_images')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteStoryImage(id: string): Promise<void> {
        const { error } = await supabase
            .from('story_images')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async reorderImages(orderedIds: string[]): Promise<void> {
        // This is a simple reorder - in production you might want batch updates
        for (let i = 0; i < orderedIds.length; i++) {
            await supabase
                .from('story_images')
                .update({ created_at: new Date(Date.now() + i * 1000).toISOString() })
                .eq('id', orderedIds[i]);
        }
    },

    // ============ POSTING HISTORY ============

    async getPostingHistory(limit: number = 20): Promise<StoryImage[]> {
        const { data, error } = await supabase
            .from('story_images')
            .select('*')
            .in('status', ['posted', 'failed'])
            .order('posted_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    // ============ META API HELPERS ============

    async connectFacebook(accessToken: string, pageId: string): Promise<void> {
        await this.updateSettings({
            facebook_page_id: pageId,
            facebook_page_token: accessToken,
            is_connected: true
        });
    },

    async connectInstagram(accountId: string): Promise<void> {
        await this.updateSettings({
            instagram_account_id: accountId
        });
    },

    async disconnect(): Promise<void> {
        await this.updateSettings({
            facebook_page_id: null,
            facebook_page_token: null,
            instagram_account_id: null,
            is_connected: false
        });
    },

    // ============ CAPTION RESOLUTION ============

    async resolveCaption(image: StoryImage, slot: PostingSlot | null): Promise<string | null> {
        // Priority 1: Manual caption on image
        if (image.caption) {
            return image.caption;
        }

        // Priority 2: Template selected for image
        if (image.caption_template_id && image.caption_template) {
            const caption = image.caption_template.caption;
            const hashtags = image.caption_template.hashtags;
            return hashtags ? `${caption}\n\n${hashtags}` : caption;
        }

        // Priority 3: Slot's default template
        if (image.use_slot_caption && slot && slot.caption_template) {
            const caption = slot.caption_template.caption;
            const hashtags = slot.caption_template.hashtags;
            return hashtags ? `${caption}\n\n${hashtags}` : caption;
        }

        // Priority 4: Slot's custom caption
        if (image.use_slot_caption && slot && slot.custom_caption) {
            return slot.custom_caption;
        }

        // No caption
        return null;
    },

    // ============ UPLOAD LOGO ============

    async uploadLogo(file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `logo_${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
            .from('social-media')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('social-media')
            .getPublicUrl(filePath);

        await this.updateSettings({ logo_url: data.publicUrl });

        return data.publicUrl;
    },

    // ============ UPLOAD STORY IMAGE ============

    async uploadStoryImage(file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `story_${Date.now()}.${fileExt}`;
        const filePath = `stories/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('social-media')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('social-media')
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

    // ============ UPDATE IMAGE STATUS ============

    async updateImageStatus(id: string, updates: Partial<StoryImage>): Promise<void> {
        const { error } = await supabase
            .from('story_images')
            .update({ ...updates })
            .eq('id', id);

        if (error) throw error;
    }
};
