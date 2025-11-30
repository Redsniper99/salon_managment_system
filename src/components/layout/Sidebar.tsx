'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserRole } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import {
    LayoutDashboard,
    Calendar,
    ShoppingCart,
    Scissors,
    Users,
    UserCircle,
    Tag,
    Bell,
    BarChart3,
    CreditCard,
    Settings,
    DollarSign,
    Target,
    Megaphone,
    LucideIcon,
} from 'lucide-react';

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    allowedRoles: UserRole[];
}

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        allowedRoles: ['Owner', 'Manager', 'Receptionist', 'Stylist'],
    },
    {
        label: 'Appointments',
        href: '/appointments',
        icon: Calendar,
        allowedRoles: ['Owner', 'Manager', 'Receptionist', 'Stylist'],
    },
    {
        label: 'POS & Billing',
        href: '/pos',
        icon: ShoppingCart,
        allowedRoles: ['Owner', 'Manager', 'Receptionist'],
    },
    {
        label: 'Services',
        href: '/services',
        icon: Scissors,
        allowedRoles: ['Owner', 'Manager'],
    },
    {
        label: 'Staff',
        href: '/staff',
        icon: Users,
        allowedRoles: ['Owner', 'Manager'],
    },
    {
        label: 'Customers',
        href: '/customers',
        icon: UserCircle,
        allowedRoles: ['Owner', 'Manager', 'Receptionist'],
    },
    {
        label: 'Earnings',
        href: '/earnings',
        icon: DollarSign,
        allowedRoles: ['Owner', 'Manager', 'Stylist', 'Receptionist'],
    },
    {
        label: 'Customer Segments',
        href: '/segments',
        icon: Target,
        allowedRoles: ['Owner', 'Manager'],
    },
    {
        label: 'Promo Codes',
        href: '/promos',
        icon: Tag,
        allowedRoles: ['Owner', 'Manager'],
    },
    {
        label: 'Notifications',
        href: '/notifications',
        icon: Bell,
        allowedRoles: ['Owner', 'Manager'],
    },
    {
        label: 'Campaigns',
        href: '/campaigns',
        icon: Megaphone,
        allowedRoles: ['Owner', 'Manager'],
    },
    {
        label: 'Reports',
        href: '/reports',
        icon: BarChart3,
        allowedRoles: ['Owner', 'Manager'],
    },
    {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        allowedRoles: ['Owner', 'Stylist'],
    },
    {
        label: 'Subscription',
        href: '/subscription',
        icon: CreditCard,
        allowedRoles: ['Owner'],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    const filteredNavItems = navItems.filter((item) =>
        user ? item.allowedRoles.includes(user.role) : false
    );

    return (
        <aside className="hidden lg:flex flex-col w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-screen transition-colors">
            <div className="p-6">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                        <Scissors className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">SalonFlow</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Salon Management</p>
                    </div>
                </Link>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                                isActive
                                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            )}
                        >
                            <Icon className={cn('h-5 w-5', isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-500')} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-500 text-center">
                    v1.0.0 • {user?.role}
                </div>
            </div>
        </aside>
    );
}
