// User and Authentication Types
export type UserRole = 'Owner' | 'Manager' | 'Receptionist' | 'Stylist';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    branchId?: string;
    isActive: boolean;
}

// Appointment Types
export type AppointmentStatus =
    | 'Pending'
    | 'Confirmed'
    | 'InService'
    | 'Completed'
    | 'Cancelled'
    | 'NoShow';

export interface Appointment {
    id: string;
    customerId: string;
    stylistId: string;
    branchId: string;
    services: string[]; // Array of service IDs
    date: string;
    startTime: string;
    duration: number; // in minutes
    status: AppointmentStatus;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// Customer Types
export interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    gender?: 'Male' | 'Female' | 'Other';
    totalVisits: number;
    totalSpent: number;
    lastVisit?: string;
    preferences?: string;
    createdAt: string;
}

// Service Types
export type ServiceCategory =
    | 'Hair'
    | 'Beard'
    | 'Facial'
    | 'Bridal'
    | 'Kids'
    | 'Spa'
    | 'Other';

export interface Service {
    id: string;
    name: string;
    category: ServiceCategory;
    price: number;
    duration: number; // in minutes
    gender?: 'Male' | 'Female' | 'Unisex';
    isActive: boolean;
    description?: string;
}

// Staff Types
export interface Staff {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    branchId: string;
    specializations: string[]; // Service IDs they can perform
    workingDays: string[]; // ['Monday', 'Tuesday', ...]
    workingHours: {
        start: string;
        end: string;
    };
    isActive: boolean;
    createdAt: string;
}

// Invoice Types
export type PaymentMethod = 'Cash' | 'Card' | 'BankTransfer' | 'UPI' | 'Other';

export interface InvoiceItem {
    id: string;
    type: 'service' | 'manual';
    serviceId?: string;
    description: string;
    price: number;
    quantity: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    customerId: string;
    branchId: string;
    appointmentId?: string;
    items: InvoiceItem[];
    subtotal: number;
    discount: number;
    promoCode?: string;
    tax: number;
    total: number;
    paymentMethod: PaymentMethod;
    createdAt: string;
    createdBy: string; // User ID
}

// Promo Code Types
export type PromoType = 'percentage' | 'fixed';

export interface PromoCode {
    id: string;
    code: string;
    type: PromoType;
    value: number;
    minSpend: number;
    startDate: string;
    endDate: string;
    usageLimit: number;
    usedCount: number;
    isActive: boolean;
    description?: string;
}

// Branch Types
export interface Branch {
    id: string;
    name: string;
    address: string;
    phone: string;
    isActive: boolean;
}

// Notification Types
export type NotificationType =
    | 'AppointmentConfirmation'
    | 'AppointmentReminder'
    | 'Cancellation'
    | 'Invoice'
    | 'Promotional';

export interface NotificationSettings {
    type: NotificationType;
    enabled: boolean;
    template?: string;
}

// Subscription Types
export type SubscriptionPlan = 'Basic' | 'Standard' | 'Premium' | 'Lifetime';

export interface Subscription {
    id: string;
    salonId: string;
    plan: SubscriptionPlan;
    startDate: string;
    expiryDate?: string;
    limits: {
        maxStaff: number;
        maxBranches: number;
        smsQuota: number;
    };
    usage: {
        staffCount: number;
        branchCount: number;
        smsUsed: number;
    };
    isActive: boolean;
}

// Dashboard Statistics Types
export interface DashboardStats {
    todayRevenue: number;
    todayAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    topServices: {
        serviceId: string;
        serviceName: string;
        count: number;
        revenue: number;
    }[];
    topStylists: {
        stylistId: string;
        stylistName: string;
        revenue: number;
        appointmentCount: number;
    }[];
}

// Report Types
export interface RevenueReport {
    date: string;
    revenue: number;
    appointmentCount: number;
    customerCount: number;
}

export interface ServicePerformance {
    serviceId: string;
    serviceName: string;
    totalRevenue: number;
    bookingCount: number;
    averagePrice: number;
}

export interface StaffPerformance {
    staffId: string;
    staffName: string;
    totalRevenue: number;
    appointmentCount: number;
    completionRate: number;
}
