'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ShoppingCart, Plus, Tag } from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import { formatCurrency } from '@/lib/utils';

export default function POSPage() {
    const [cart, setCart] = useState<any[]>([]);
    const [discount, setDiscount] = useState(0);
    const [promoCode, setPromoCode] = useState('');

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal - discount + tax;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">POS & Billing</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Process payments and generate invoices</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Services & Customer */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Search */}
                    <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer</h2>
                        <Input
                            type="text"
                            placeholder="Search customer by phone or name..."
                            leftIcon={<Search className="h-5 w-5" />}
                        />
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <p className="text-sm text-gray-500 dark:text-gray-400">No customer selected</p>
                        </div>
                    </div>

                    {/* Services */}
                    <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Services</h2>
                        <Input
                            type="text"
                            placeholder="Search services..."
                            leftIcon={<Search className="h-5 w-5" />}
                        />
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {['Hair Cut', 'Styling', 'Coloring', 'Beard Trim', 'Facial', 'Bridal'].map((service) => (
                                <button
                                    key={service}
                                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 text-left"
                                >
                                    <p className="font-medium text-gray-900 dark:text-white">{service}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Rs 500</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Manual Fee */}
                    <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Manual Fee</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                type="text"
                                placeholder="Description"
                                label="Description"
                            />
                            <Input
                                type="number"
                                placeholder="Amount"
                                label="Amount (Rs)"
                            />
                        </div>
                        <Button variant="outline" size="sm" className="mt-4" leftIcon={<Plus className="h-4 w-4" />}>
                            Add to Bill
                        </Button>
                    </div>
                </div>

                {/* Right: Bill Summary */}
                <div className="lg:col-span-1">
                    <div className="card p-6 sticky top-24 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                                <ShoppingCart className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bill Summary</h2>
                        </div>

                        {/* Cart Items */}
                        <div className="space-y-3 mb-6 max-h-48 overflow-y-auto">
                            {cart.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No items in cart</p>
                            ) : (
                                cart.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(item.price * item.quantity)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Promo Code */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Promo Code</label>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="Enter code"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                    leftIcon={<Tag className="h-4 w-4" />}
                                />
                                <Button variant="outline" size="md">Apply</Button>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="space-y-2 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Discount</span>
                                    <span className="font-medium text-success-600 dark:text-success-400">-{formatCurrency(discount)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Tax (5%)</span>
                                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(tax)}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-6">
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">Total</span>
                            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{formatCurrency(total)}</span>
                        </div>

                        {/* Payment Method */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                            <select className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option>Cash</option>
                                <option>Card</option>
                                <option>UPI</option>
                                <option>Bank Transfer</option>
                            </select>
                        </div>

                        <Button variant="primary" size="lg" className="w-full">
                            Complete Payment
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
