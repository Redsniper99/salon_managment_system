import { PaymentBreakdown } from '@/lib/types';

/**
 * Helper function to calculate payment totals by method
 * Supports both single payment and split payments
 */
export function calculatePaymentTotals(invoices: any[]): {
    totalCash: number;
    totalCard: number;
    totalBankTransfer: number;
    totalOther: number;
    splitPaymentCount: number;
} {
    let totalCash = 0;
    let totalCard = 0;
    let totalBankTransfer = 0;
    let totalOther = 0;
    let splitPaymentCount = 0;

    invoices.forEach(invoice => {
        // Check if invoice has payment breakdown (split payment)
        if (invoice.payment_breakdown && Array.isArray(invoice.payment_breakdown) && invoice.payment_breakdown.length > 1) {
            splitPaymentCount++;
            // Sum each payment method from breakdown
            invoice.payment_breakdown.forEach((payment: PaymentBreakdown) => {
                switch (payment.method) {
                    case 'Cash':
                        totalCash += payment.amount;
                        break;
                    case 'Card':
                        totalCard += payment.amount;
                        break;
                    case 'BankTransfer':
                        totalBankTransfer += payment.amount;
                        break;
                    default:
                        totalOther += payment.amount;
                }
            });
        } else {
            // Single payment method - use total amount
            const method = invoice.payment_method || 'Cash';
            const total = invoice.total || 0;

            switch (method) {
                case 'Cash':
                    totalCash += total;
                    break;
                case 'Card':
                    totalCard += total;
                    break;
                case 'BankTransfer':
                    totalBankTransfer += total;
                    break;
                default:
                    totalOther += total;
            }
        }
    });

    return {
        totalCash,
        totalCard,
        totalBankTransfer,
        totalOther,
        splitPaymentCount
    };
}

/**
 * Get payment method breakdown for an invoice
 * Handles both old (single payment) and new (split payment) formats
 */
export function getPaymentMethodBreakdown(invoice: any): PaymentBreakdown[] {
    if (invoice.payment_breakdown && Array.isArray(invoice.payment_breakdown) && invoice.payment_breakdown.length > 0) {
        return invoice.payment_breakdown;
    }

    // Backward compatibility: create breakdown from single payment method
    return [{
        method: invoice.payment_method || 'Cash',
        amount: invoice.total || 0
    }];
}
