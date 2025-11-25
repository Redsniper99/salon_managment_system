'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Copy } from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import { PromoCode } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

// Mock data
const mockPromos: PromoCode[] = [
    {
        id: '1',
        code: 'WELCOME20',
        type: 'percentage',
        value: 20,
        minSpend: 1000,
        startDate: '2024-11-01',
        endDate: '2024-12-31',
        usageLimit: 100,
        usedCount: 45,
        isActive: true,
        description: 'Welcome discount for new customers',
    },
    {
        id: '2',
        code: 'BRIDAL500',
        type: 'fixed',
        value: 500,
        minSpend: 5000,
        startDate: '2024-11-01',
        endDate: '2024-11-30',
        usageLimit: 50,
        usedCount: 12,
        isActive: true,
        description: 'Discount on bridal packages',
    },
];

export default function PromosPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const filteredPromos = mockPromos.filter((promo) => {
        if (statusFilter === 'Active' && !promo.isActive) return false;
        if (statusFilter === 'Inactive' && promo.isActive) return false;
        if (searchQuery && !promo.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Promo Codes</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage promotional offers</p>
                </div>
                <Button variant="primary" leftIcon={<Plus className="h-5 w-5" />}>
                    Create Promo Code
                </Button>
            </div>

            {/* Filters */}
            <div className="card p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            type="text"
                            placeholder="Search promo codes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="h-5 w-5" />}
                        />
                    </div>
                    <div className="flex gap-2">
                        {['All', 'Active', 'Inactive'].map((status) => (
                            <Button
                                key={status}
                                variant={statusFilter === status ? 'primary' : 'outline'}
                                size="md"
                                onClick={() => setStatusFilter(status)}
                            >
                                {status}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Promo Codes Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPromos.map((promo, index) => (
                    <motion.div
                        key={promo.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-xl font-mono font-bold text-primary-700 dark:text-primary-400">
                                        {promo.code}
                                    </div>
                                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                        <Copy className="h-4 w-4 text-gray-500" />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{promo.description}</p>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-xs font-medium ${promo.isActive
                                ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                {promo.isActive ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Discount</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {promo.type === 'percentage' ? `${promo.value}%` : formatCurrency(promo.value)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Min. Spend</span>
                                <span className="text-sm text-gray-900 dark:text-white">{formatCurrency(promo.minSpend)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Usage</span>
                                <span className="text-sm text-gray-900 dark:text-white">
                                    {promo.usedCount} / {promo.usageLimit}
                                </span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(promo.usedCount / promo.usageLimit) * 100}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-xs text-gray-500">
                                    {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" leftIcon={<Edit className="h-4 w-4" />}>
                                Edit
                            </Button>
                            <Button variant="ghost" size="sm">
                                {promo.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
