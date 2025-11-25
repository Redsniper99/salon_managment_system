'use client';

import { motion } from 'framer-motion';
import { Crown, AlertTriangle, Users, Building2, MessageSquare } from 'lucide-react';
import Button from '@/components/shared/Button';

export default function SubscriptionPage() {
    // Mock subscription data
    const subscription = {
        plan: 'Premium',
        startDate: '2024-01-01',
        expiryDate: '2024-12-31',
        isActive: true,
        limits: {
            maxStaff: 20,
            maxBranches: 5,
            smsQuota: 2000,
        },
        usage: {
            staffCount: 12,
            branchCount: 2,
            smsUsed: 487,
        },
    };

    const plans = [
        {
            name: 'Basic',
            price: 5000,
            features: ['5 Staff Members', '1 Branch', '500 SMS/month', 'Basic Reports'],
        },
        {
            name: 'Standard',
            price: 12000,
            features: ['10 Staff Members', '3 Branches', '1000 SMS/month', 'Advanced Reports', 'Priority Support'],
        },
        {
            name: 'Premium',
            price: 20000,
            features: ['20 Staff Members', '5 Branches', '2000 SMS/month', 'Full Analytics', '24/7 Support', 'Custom Features'],
            highlighted: true,
        },
        {
            name: 'Lifetime',
            price: 150000,
            features: ['Unlimited Staff', 'Unlimited Branches', 'Unlimited SMS', 'All Features', 'Lifetime Updates'],
        },
    ];

    const getUsagePercentage = (used: number, limit: number) => (used / limit) * 100;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your SalonFlow subscription and limits</p>
            </div>

            {/* Current Plan */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white"
            >
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Crown className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">{subscription.plan} Plan</h2>
                        </div>
                        <p className="text-primary-100">
                            Active until {new Date(subscription.expiryDate).toLocaleDateString('en-IN')}
                        </p>
                    </div>
                    <div className="px-3 py-1.5 bg-white/20 rounded-xl font-semibold">
                        Active
                    </div>
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="h-5 w-5 text-primary-100" />
                            <span className="text-sm text-primary-100">Staff</span>
                        </div>
                        <p className="text-2xl font-bold mb-2">
                            {subscription.usage.staffCount} / {subscription.limits.maxStaff}
                        </p>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full"
                                style={{ width: `${getUsagePercentage(subscription.usage.staffCount, subscription.limits.maxStaff)}%` }}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-5 w-5 text-primary-100" />
                            <span className="text-sm text-primary-100">Branches</span>
                        </div>
                        <p className="text-2xl font-bold mb-2">
                            {subscription.usage.branchCount} / {subscription.limits.maxBranches}
                        </p>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full"
                                style={{ width: `${getUsagePercentage(subscription.usage.branchCount, subscription.limits.maxBranches)}%` }}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-5 w-5 text-primary-100" />
                            <span className="text-sm text-primary-100">SMS This Month</span>
                        </div>
                        <p className="text-2xl font-bold mb-2">
                            {subscription.usage.smsUsed} / {subscription.limits.smsQuota}
                        </p>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-warning-400 rounded-full"
                                style={{ width: `${getUsagePercentage(subscription.usage.smsUsed, subscription.limits.smsQuota)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Warning if nearing limits */}
            {subscription.usage.staffCount / subscription.limits.maxStaff > 0.8 && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="card p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800"
                >
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-warning-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-warning-900 dark:text-warning-200 mb-1">Approaching Staff Limit</h3>
                            <p className="text-sm text-warning-700 dark:text-warning-300">
                                You're using {subscription.usage.staffCount} of {subscription.limits.maxStaff} staff slots.
                                Consider upgrading your plan to add more team members.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Available Plans */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Available Plans</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 ${plan.highlighted
                                ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                : ''
                                }`}
                        >
                            {plan.highlighted && (
                                <div className="px-3 py-1 bg-primary-600 text-white text-xs font-semibold rounded-lg inline-block mb-4">
                                    Current Plan
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                            <div className="mb-6">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">Rs {plan.price.toLocaleString()}</span>
                                {plan.name !== 'Lifetime' && <span className="text-gray-500 dark:text-gray-400">/month</span>}
                            </div>
                            <ul className="space-y-3 mb-6">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="text-success-600 dark:text-success-400 mt-0.5">✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Button
                                variant={plan.highlighted ? 'primary' : 'outline'}
                                className="w-full"
                                disabled={plan.highlighted}
                            >
                                {plan.highlighted ? 'Active' : 'Upgrade'}
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
