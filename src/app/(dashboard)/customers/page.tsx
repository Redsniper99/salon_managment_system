'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Eye, Phone, Mail } from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import { Customer } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

// Mock data
const mockCustomers: Customer[] = [
    {
        id: '1',
        name: 'Anjali Perera',
        phone: '+94 77 123 4567',
        email: 'anjali@example.com',
        gender: 'Female',
        totalVisits: 12,
        totalSpent: 18500,
        lastVisit: '2024-11-20',
        createdAt: '2024-01-15',
    },
    {
        id: '2',
        name: 'Kasun Silva',
        phone: '+94 77 234 5678',
        email: 'kasun@example.com',
        gender: 'Male',
        totalVisits: 8,
        totalSpent: 6200,
        lastVisit: '2024-11-18',
        createdAt: '2024-03-10',
    },
    {
        id: '3',
        name: 'Nimal Fernando',
        phone: '+94 77 345 6789',
        gender: 'Male',
        totalVisits: 15,
        totalSpent: 22000,
        lastVisit: '2024-11-22',
        createdAt: '2023-12-05',
    },
];

export default function CustomersPage() {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCustomers = mockCustomers.filter((customer) => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                customer.name.toLowerCase().includes(query) ||
                customer.phone.includes(query) ||
                customer.email?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage customer database</p>
                </div>
                <Button variant="primary" leftIcon={<Plus className="h-5 w-5" />}>
                    Add Customer
                </Button>
            </div>

            {/* Search */}
            <div className="card p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <Input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="h-5 w-5" />}
                />
            </div>

            {/* Customer Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Customers</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{mockCustomers.length}</p>
                </div>
                <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Month</p>
                    <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">+8</p>
                </div>
                <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active This Week</p>
                    <p className="text-3xl font-bold text-success-600 dark:text-success-400">24</p>
                </div>
            </div>

            {/* Customers List */}
            <div className="space-y-4">
                {filteredCustomers.map((customer, index) => (
                    <motion.div
                        key={customer.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                    >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="flex-shrink-0 w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
                                    <span className="text-xl font-bold text-primary-600">
                                        {customer.name.split(' ').map(n => n[0]).join('')}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{customer.name}</h3>
                                        {customer.gender && (
                                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg">
                                                {customer.gender}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        <span className="flex items-center gap-1">
                                            <Phone className="h-4 w-4" />
                                            {customer.phone}
                                        </span>
                                        {customer.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-4 w-4" />
                                                {customer.email}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mt-3">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-500">Total Visits</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{customer.totalVisits}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-500">Total Spent</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(customer.totalSpent)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-500">Last Visit</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {customer.lastVisit ? formatDate(customer.lastVisit) : 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                                View Details
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
