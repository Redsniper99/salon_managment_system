/**
 * E2E Test: POS Complete Workflow
 * Tests full POS billing with mixed cart (appointments + walk-in + products)
 */

import { test, expect } from '@playwright/test';

test.describe('POS Complete Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@salon.com');
        await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'password');
        await page.click('button[type="submit"]');
        await page.waitForURL('/dashboard');
        await page.goto('/pos');
    });

    test('Mixed cart: Appointment + Walk-in + Product', async ({ page }) => {
        // Select customer
        await page.fill('input[placeholder*="Search"]', '077');
        await page.waitForTimeout(1000);
        await page.locator('[class*="dropdown"] button').first().click();

        // Add appointment
        const appointmentCard = page.locator('[class*="appointment"]').first();
        await appointmentCard.click();

        // Verify in cart
        await expect(page.locator('text=Appointment at')).toBeVisible();

        // Add walk-in service
        await page.locator('text=Walk-in Services').scrollIntoViewIfNeeded();
        await page.locator('select').first().selectOption({ index: 1 });
        await page.locator('button:has-text("Add")').first().click();

        // Verify walk-in in cart with stylist name
        await expect(page.locator('[class*="cart"] text=Haircut')).toBeVisible();

        // Complete payment
        await page.click('button:has-text("Pay")');

        // Verify success
        await expect(page.locator('text=Payment successful')).toBeVisible();
    });

    test('Apply loyalty card discount', async ({ page }) => {
        // Select customer with loyalty card
        await page.fill('input[placeholder*="Search"]', '077');
        await page.waitForTimeout(1000);
        await page.locator('[class*="dropdown"] button').first().click();

        // Add service
        await page.locator('select').first().selectOption({ index: 1 });
        await page.locator('button:has-text("Add")').first().click();

        // Verify loyalty status shown
        await expect(page.locator('text=Loyalty Status')).toBeVisible();

        // Click apply discount
        await page.click('button:has-text("Apply")');

        // Verify discount applied
        await expect(page.locator('text=discount')).toBeVisible();

        // Complete payment
        await page.click('button:has-text("Pay")');
    });

    test('Split payment', async ({ page }) => {
        // Select customer and add items
        await page.fill('input[placeholder*="Search"]', '077');
        await page.waitForTimeout(1000);
        await page.locator('[class*="dropdown"] button').first().click();

        await page.locator('select').first().selectOption({ index: 1 });
        await page.locator('button:has-text("Add")').first().click();

        // Click split payment
        await page.click('button:has-text("Split Payment")');

        // Enter amounts
        await page.fill('input[placeholder*="Cash"]', '500');
        await page.fill('input[placeholder*="Card"]', '500');

        // Verify total matches
        await expect(page.locator('text=Total: 1000')).toBeVisible();

        // Confirm
        await page.click('button:has-text("Confirm")');

        // Complete payment
        await page.click('button:has-text("Pay")');

        // Verify success
        await expect(page.locator('text=Payment successful')).toBeVisible();
    });

    test('Manual discount application', async ({ page }) => {
        await page.fill('input[placeholder*="Search"]', '077');
        await page.waitForTimeout(1000);
        await page.locator('[class*="dropdown"] button').first().click();

        await page.locator('select').first().selectOption({ index: 1 });
        await page.locator('button:has-text("Add")').first().click();

        // Enter manual discount
        await page.fill('input[placeholder*="discount"]', '100');

        // Verify total updated
        await expect(page.locator('text=Discount: ₹100')).toBeVisible();

        // Complete payment
        await page.click('button:has-text("Pay")');
    });

    test('Clear cart functionality', async ({ page }) => {
        await page.fill('input[placeholder*="Search"]', '077');
        await page.waitForTimeout(1000);
        await page.locator('[class*="dropdown"] button').first().click();

        // Add items
        await page.locator('select').first().selectOption({ index: 1 });
        await page.locator('button:has-text("Add")').first().click();

        // Verify items in cart
        await expect(page.locator('[class*="cart"] [class*="item"]')).toHaveCount(1);

        // Click clear
        await page.click('button:has-text("Clear")');

        // Verify cart empty
        await expect(page.locator('text=No items in bill')).toBeVisible();
    });
});
