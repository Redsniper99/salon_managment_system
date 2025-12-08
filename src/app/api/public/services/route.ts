import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a public Supabase client (no auth required for reading public data)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/public/services
 * 
 * Returns all active services for the salon.
 * Supports optional filtering by category or gender.
 * 
 * Query params:
 * - category: Filter by service category (e.g., "Hair", "Spa", "Bridal")
 * - gender: Filter by gender applicability ("Male", "Female", "Unisex")
 * - branch_id: Filter by branch (optional)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const gender = searchParams.get('gender');
        const branchId = searchParams.get('branch_id');

        let query = supabase
            .from('services')
            .select('id, name, description, category, price, duration, gender, is_active')
            .eq('is_active', true)
            .order('category')
            .order('name');

        // Apply filters
        if (category) {
            query = query.eq('category', category);
        }

        if (gender) {
            query = query.or(`gender.eq.${gender},gender.eq.Unisex`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching services:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch services' },
                { status: 500 }
            );
        }

        // Group services by category for easier frontend rendering
        const grouped = data?.reduce((acc: any, service) => {
            const cat = service.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
        }, {});

        return NextResponse.json({
            success: true,
            data: data,
            grouped: grouped,
            total: data?.length || 0
        });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
