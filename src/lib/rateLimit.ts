import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter
// For production, use Redis or a dedicated rate limiting service
const rateLimit = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute

export function getRateLimitKey(req: NextRequest): string {
    // Use IP address as the key
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return ip;
}

export function checkRateLimit(key: string, limit: number = MAX_REQUESTS_PER_WINDOW): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const record = rateLimit.get(key);

    // Clean up expired entries
    if (record && now > record.resetTime) {
        rateLimit.delete(key);
    }

    const current = rateLimit.get(key);

    if (!current) {
        // First request
        rateLimit.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true, remaining: limit - 1, resetIn: RATE_LIMIT_WINDOW_MS };
    }

    if (current.count >= limit) {
        // Rate limit exceeded
        return { allowed: false, remaining: 0, resetIn: current.resetTime - now };
    }

    // Increment counter
    current.count++;
    return { allowed: true, remaining: limit - current.count, resetIn: current.resetTime - now };
}

export function rateLimitResponse(resetIn: number): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil(resetIn / 1000)
        },
        {
            status: 429,
            headers: {
                'Retry-After': String(Math.ceil(resetIn / 1000))
            }
        }
    );
}
