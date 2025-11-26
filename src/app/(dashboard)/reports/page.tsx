'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Download, BarChart3, TrendingUp } from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import { formatCurrency } from '@/lib/utils';

export default function ReportsPage() {
    const [dateRange, setDateRange] = useState({ start: '2024-11-01', end: '2024-11-26' });

    // Mock data
    const revenueData = [
        { date: '2024-11-20', revenue: 12500, appointments: 15 },
        { date: '2024-11-21', revenue: 18000, appointments: 22 },
        { date: '2024-11-22', revenue: 14500, appointments: 18 },
        { date: '2024-11-23', revenue: 22000, appointments: 28 },
        { date: '2024-11-24', revenue: 16800, appointments: 20 },
        { date: '2024-11-25', revenue: 19500, appointments: 24 },
    ];

    const totalRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0);
    const totalAppointments = revenueData.reduce((sum, day) => sum + day.appointments, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Business insights and performance metrics</p>
                </div>
                <Button variant="primary" leftIcon={<Download className="h-5 w-5" />}>
                    Export Report
                </Button>
            </div>

            {/* Date Range Filter */}
            <div className="card p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                        type="date"
                        label="Start Date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        leftIcon={<Calendar className="h-5 w-5" />}
                        className="sm:flex-1"
                    />
                    <Input
                        type="date"
                        label="End Date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        leftIcon={<Calendar className="h-5 w-5" />}
                        className="sm:flex-1"
                    />
                    <Button variant="primary" className="self-end sm:flex-none">
                        Apply
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                            <TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h3 className="font-medium text-gray-600 dark:text-gray-400">Total Revenue</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalRevenue)}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="card p-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-secondary-100 dark:bg-secondary-900/30 rounded-xl">
                            <BarChart3 className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
                        </div>
                        <h3 className="font-medium text-gray-600 dark:text-gray-400">Appointments</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalAppointments}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card p-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-xl">
                            <TrendingUp className="h-5 w-5 text-success-600 dark:text-success-400" />
                        </div>
                        <h3 className="font-medium text-gray-600 dark:text-gray-400">Avg. Per Day</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(totalRevenue / revenueData.length)}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="card p-6"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-xl">
                            <BarChart3 className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                        </div>
                        <h3 className="font-medium text-gray-600 dark:text-gray-400">Avg. Bill</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(totalRevenue / totalAppointments)}
                    </p>
                </motion.div>
            </div>

            {/* Revenue Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
            >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue Trend</h2>
                <div className="space-y-3">
                    {revenueData.map((day, index) => {
                        const maxRevenue = Math.max(...revenueData.map(d => d.revenue));
                        const percentage = (day.revenue / maxRevenue) * 100;

                        return (
                            <div key={index}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {new Date(day.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(day.revenue)}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">
                                            ({day.appointments} appointments)
                                        </span>
                                    </div>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                        className="h-full bg-primary-500 rounded-full"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}
