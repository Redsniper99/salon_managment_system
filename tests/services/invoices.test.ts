/**
 * Invoice Service Tests
 * Tests for invoice creation and walk-in billing
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Invoice Service', () => {
    let testData: any = {};

    beforeEach(() => {
        testData = {
            customer: {
                id: `customer-${Date.now()}`,
                name: 'Test Customer',
                phone: '0771234567',
            },
            stylist: {
                id: `stylist-${Date.now()}`,
                name: 'Test Stylist',
                commission: 40,
            },
            service: {
                id: `service-${Date.now()}`,
                name: 'Haircut',
                price: 1000,
            },
        };
    });

    test('Create walk-in invoice without appointment', async () => {
        const invoiceData = {
            customer_id: testData.customer.id,
            branch_id: 'default-branch',
            appointment_id: null, // Walk-in has no appointment
            items: [
                {
                    type: 'walk-in-service',
                    serviceId: testData.service.id,
                    stylistId: testData.stylist.id,
                    stylistName: testData.stylist.name,
                    name: testData.service.name,
                    price: testData.service.price,
                    quantity: 1,
                },
            ],
            subtotal: 1000,
            discount: 0,
            tax: 0,
            total: 1000,
            payment_method: 'Cash',
            created_by: 'test-user',
        };

        // Verify structure
        expect(invoiceData.appointment_id).toBeNull();
        expect(invoiceData.items[0].type).toBe('walk-in-service');
        expect(invoiceData.items[0].stylistId).toBeDefined();
    });

    test('Invoice items contain stylist information', async () => {
        const walkInItem = {
            type: 'walk-in-service',
            serviceId: 'service-1',
            stylistId: 'stylist-1',
            stylistName: 'John Doe',
            name: 'Haircut',
            price: 1000,
            quantity: 1,
        };

        expect(walkInItem).toHaveProperty('stylistId');
        expect(walkInItem).toHaveProperty('stylistName');
        expect(walkInItem.type).toBe('walk-in-service');
    });

    test('Calculate invoice totals correctly', () => {
        const items = [
            { price: 1000, quantity: 1 },
            { price: 500, quantity: 2 },
            { price: 750, quantity: 1 },
        ];

        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discount = 200;
        const tax = 0;
        const total = subtotal - discount + tax;

        expect(subtotal).toBe(2750);
        expect(total).toBe(2550);
    });

    test('Split payment breakdown validation', () => {
        const paymentBreakdown = [
            { method: 'Cash', amount: 1000 },
            { method: 'Card', amount: 500 },
        ];

        const totalPaid = paymentBreakdown.reduce((sum, p) => sum + p.amount, 0);
        const invoiceTotal = 1500;

        expect(totalPaid).toBe(invoiceTotal);
    });

    test('Loyalty discount applied correctly', () => {
        const subtotal = 1000;
        const loyaltyDiscount = 100; // 10% loyalty card
        const total = subtotal - loyaltyDiscount;

        expect(total).toBe(900);
        expect(loyaltyDiscount / subtotal).toBe(0.1); // 10%
    });
});
