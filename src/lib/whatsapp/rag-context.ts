import { servicesService } from '@/services/services';

// Cache services to avoid DB hits on every message
let servicesCache: {
    data: string;
    timestamp: number;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const ragContext = {
    async getCompactServicesContext(): Promise<string> {
        const now = Date.now();
        
        // Return cached version if valid
        if (servicesCache && (now - servicesCache.timestamp < CACHE_TTL_MS)) {
            return servicesCache.data;
        }

        try {
            const services = await servicesService.getServices();
            if (!services.length) return "No services available currently.";

            // Group by category for cleaner context
            const categories: Record<string, any[]> = {};
            services.forEach(s => {
                const cat = s.category || 'Other';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(s);
            });

            // Create highly compact string for AI prompt
            let compactContext = "SERVICES LIST:\n";
            Object.keys(categories).forEach(cat => {
                compactContext += `[${cat}]: `;
                compactContext += categories[cat].map(s => `${s.name}(ID:${s.id},Rs.${s.price},${s.duration}m)`).join(' | ');
                compactContext += "\n";
            });

            // Update cache
            servicesCache = {
                data: compactContext,
                timestamp: now
            };

            return compactContext;
        } catch (error) {
            console.error('Failed to build RAG context for services:', error);
            return "Note: Could not fetch latest service details.";
        }
    },
    
    // Clear cache (useful when services are updated from dashboard)
    invalidateCache() {
        servicesCache = null;
    }
};
