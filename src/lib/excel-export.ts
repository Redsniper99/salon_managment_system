import * as XLSX from 'xlsx';
import { formatCurrency } from './utils';

interface SalesReportData {
    month: string;
    year: number;
    totalRevenue: number;
    totalTransactions: number;
    totalDiscount: number;
    totalTax: number;
    totalCash: number;
    totalCard: number;
    totalBankTransfer: number;
    totalUPI: number;
    totalOther: number;
    splitPaymentCount: number;
    byService: Array<{ service: string; revenue: number; count: number }>;
    dailyStats: Array<{ date: string; revenue: number; transactions: number }>;
}

/**
 * Export sales report data to Excel file
 */
export function exportSalesReportToExcel(data: SalesReportData) {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
        ['Sales Report', ''],
        ['Month', `${data.month} ${data.year}`],
        [''],
        ['Summary', ''],
        ['Total Revenue', data.totalRevenue],
        ['Total Transactions', data.totalTransactions],
        ['Total Discount', data.totalDiscount],
        ['Total Tax', data.totalTax],
        ['Net Revenue', data.totalRevenue - data.totalDiscount],
        [''],
        ['Payment Method Breakdown', ''],
        ['Cash', data.totalCash],
        ['Card', data.totalCard],
        ['Bank Transfer', data.totalBankTransfer],
        ['UPI', data.totalUPI],
        ['Other', data.totalOther],
        ['Split Transactions', data.splitPaymentCount],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: Services Breakdown
    const servicesData = [
        ['Service', 'Revenue', 'Count'],
        ...data.byService.map(s => [s.service, s.revenue, s.count])
    ];
    const wsServices = XLSX.utils.aoa_to_sheet(servicesData);
    XLSX.utils.book_append_sheet(wb, wsServices, 'Services');

    // Sheet 3: Daily Stats
    const dailyData = [
        ['Date', 'Revenue', 'Transactions'],
        ...data.dailyStats.map(d => [d.date, d.revenue, d.transactions])
    ];
    const wsDaily = XLSX.utils.aoa_to_sheet(dailyData);
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Stats');

    // Generate filename
    const filename = `Sales_Report_${data.month}_${data.year}.xlsx`;

    // Write the file
    XLSX.writeFile(wb, filename);

    return filename;
}

/**
 * Export customer data to Excel
 */
export function exportCustomersToExcel(customers: any[]) {
    const wb = XLSX.utils.book_new();

    const customerData = [
        ['Name', 'Phone', 'Email', 'Total Spent', 'Total Visits', 'Gender', 'Created Date'],
        ...customers.map(c => [
            c.name,
            c.phone,
            c.email || '',
            c.total_spent || 0,
            c.total_visits || 0,
            c.gender || '',
            c.created_at?.split('T')[0] || ''
        ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(customerData);
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');

    const filename = `Customers_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);

    return filename;
}

/**
 * Export appointments to Excel
 */
export function exportAppointmentsToExcel(appointments: any[], month: string, year: number) {
    const wb = XLSX.utils.book_new();

    const appointmentData = [
        ['Date', 'Time', 'Customer', 'Phone', 'Stylist', 'Services', 'Status', 'Duration'],
        ...appointments.map(a => [
            a.appointment_date,
            a.start_time,
            a.customer?.name || '',
            a.customer?.phone || '',
            a.stylist?.name || '',
            a.services_data?.map((s: any) => s.name).join(', ') || '',
            a.status,
            `${a.duration} min`
        ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(appointmentData);
    XLSX.utils.book_append_sheet(wb, ws, 'Appointments');

    const filename = `Appointments_${month}_${year}.xlsx`;
    XLSX.writeFile(wb, filename);

    return filename;
}
