import { getAdminClient } from '@/lib/supabase';

export interface Message {
    role: 'user' | 'model' | 'system';
    parts: { text: string }[];
}

const HISTORY_LIMIT = 20; // Keep last 20 messages for context

export const conversationManager = {
    async getHistory(phoneNumber: string): Promise<Message[]> {
        const supabase = getAdminClient();
        const { data: session } = await supabase
            .from('bot_sessions')
            .select('conversation_history')
            .eq('phone_number', phoneNumber)
            .single();

        if (!session?.conversation_history) return [];

        // Gemini expects specific format: model instead of assistant
        return (session.conversation_history as any[]).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: msg.parts || [{ text: msg.content || "" }]
        }));
    },

    async saveMessage(phoneNumber: string, role: 'user' | 'model' | 'system', content: string) {
        const supabase = getAdminClient();
        const history = await this.getHistory(phoneNumber);

        const newMessage = {
            role,
            parts: [{ text: content }]
        };

        const updatedHistory = [...history, newMessage].slice(-HISTORY_LIMIT);

        const { error } = await supabase
            .from('bot_sessions')
            .update({
                conversation_history: updatedHistory,
                last_updated: new Date().toISOString()
            })
            .eq('phone_number', phoneNumber);

        if (error) {
            console.error('Error saving conversation history:', error);
            // If column doesn't exist, we might need to handle it or notify the user
        }
    },

    async clearHistory(phoneNumber: string) {
        const supabase = getAdminClient();
        await supabase
            .from('bot_sessions')
            .update({ conversation_history: [] })
            .eq('phone_number', phoneNumber);
    }
};
