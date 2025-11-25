'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, MessageSquare, Mail, Smartphone } from 'lucide-react';
import { NotificationType } from '@/lib/types';

const notificationTypes: { type: NotificationType; label: string; description: string; icon: any }[] = [
    {
        type: 'AppointmentConfirmation',
        label: 'Appointment Confirmation',
        description: 'Send SMS when appointment is confirmed',
        icon: MessageSquare,
    },
    {
        type: 'AppointmentReminder',
        label: 'Appointment Reminder',
        description: 'Send reminder 24 hours before appointment',
        icon: Bell,
    },
    {
        type: 'Cancellation',
        label: 'Cancellation Notice',
        description: 'Notify customer when appointment is cancelled',
        icon: Mail,
    },
    {
        type: 'Invoice',
        label: 'Invoice SMS',
        description: 'Send invoice details after payment',
        icon: Smartphone,
    },
    {
        type: 'Promotional',
        label: 'Promotional Campaigns',
        description: 'Send marketing messages to customers',
        icon: MessageSquare,
    },
];

export default function NotificationsPage() {
    const [settings, setSettings] = useState<Record<NotificationType, boolean>>({
        AppointmentConfirmation: true,
        AppointmentReminder: true,
        Cancellation: true,
        Invoice: false,
        Promotional: false,
    });

    const toggleSetting = (type: NotificationType) => {
        setSettings((prev) => ({ ...prev, [type]: !prev[type] }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Configure SMS and notification preferences</p>
            </div>

            {/* SMS Usage */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
            >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">SMS Usage This Month</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">SMS Quota</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">1,000</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Used</p>
                        <p className="text-3xl font-bold text-warning-600 dark:text-warning-400">487</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Remaining</p>
                        <p className="text-3xl font-bold text-success-600 dark:text-success-400">513</p>
                    </div>
                </div>
                <div className="mt-4 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-warning-500 rounded-full" style={{ width: '48.7%' }} />
                </div>
            </motion.div>

            {/* Notification Settings */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Types</h2>
                {notificationTypes.map((item, index) => {
                    const Icon = item.icon;
                    const isEnabled = settings[item.type];

                    return (
                        <motion.div
                            key={item.type}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={`p-3 rounded-xl ${isEnabled ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-700'
                                        }`}>
                                        <Icon className={`h-6 w-6 ${isEnabled ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                                            }`} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{item.label}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleSetting(item.type)}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
