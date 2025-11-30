'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ShoppingCart, Plus, Tag, Trash2, Printer, RotateCcw } from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import ReceiptModal from '@/components/pos/ReceiptModal';
import { formatCurrency } from '@/lib/utils';
import { servicesService } from '@/services/services';
import { customersService } from '@/services/customers';
import { invoicesService } from '@/services/invoices';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

export default function POSPage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [cart, setCart] = useState<any[]>([]);
    const [discount, setDiscount] = useState(0);
    const [promoCode, setPromoCode] = useState('');
    const [services, setServices] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [serviceSearch, setServiceSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [manualItem, setManualItem] = useState({ description: '', price: '' });

    // Receipt Modal
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastInvoice, setLastInvoice] = useState<any>(null);

    // Fetch services on mount
    useEffect(() => {
        fetchServices();
    }, []);

    // Search customers when query changes
    useEffect(() => {
        if (customerSearch.length > 2) {
            searchCustomers();
        } else {
            setCustomers([]);
        }
    }, [customerSearch]);

    const fetchServices = async () => {
        try {
            const data = await servicesService.getServices();
            setServices(data || []);
        } catch (error) {
            console.error('Error fetching services:', error);
            showToast('Failed to load services', 'error');
        }
    };

    const searchCustomers = async () => {
        try {
            const data = await customersService.searchCustomers(customerSearch);
            setCustomers(data || []);
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    };

    const addToCart = (service: any) => {
        const existingItem = cart.find(item => item.serviceId === service.id);
        if (existingItem) {
            setCart(cart.map(item =>
                item.serviceId === service.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                type: 'service',
                serviceId: service.id,
                name: service.name,
                price: service.price,
                quantity: 1
            }]);
        }
        showToast(`Added ${service.name} to cart`, 'success');
    };

    const addManualItem = () => {
        if (!manualItem.description || !manualItem.price) {
            showToast('Please enter description and price', 'warning');
            return;
        }
        setCart([...cart, {
            type: 'manual',
            name: manualItem.description,
            price: parseFloat(manualItem.price),
            quantity: 1,
            description: manualItem.description
        }]);
        setManualItem({ description: '', price: '' });
        showToast('Manual item added', 'success');
    };

    const removeFromCart = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const clearCart = () => {
        if (confirm('Are you sure you want to clear the cart?')) {
            setCart([]);
            setDiscount(0);
            setPromoCode('');
            showToast('Cart cleared', 'info');
        }
    };

    const handleApplyPromo = async () => {
        if (!promoCode) return;
        const result = await invoicesService.validatePromoCode(promoCode, subtotal);
        if (result.valid) {
            setDiscount(result.discountAmount);
            showToast('Promo code applied!', 'success');
        } else {
            showToast('Invalid promo code', 'error');
            setDiscount(0);
        }
    };

    const handlePayment = async () => {
        if (!selectedCustomer) {
            showToast('Please select a customer', 'warning');
            return;
        }
        if (cart.length === 0) {
            showToast('Cart is empty', 'warning');
            return;
        }
        if (!user) {
            showToast('You must be logged in', 'error');
            return;
        }

        setProcessingPayment(true);
        try {
            // Get valid branch ID
            let branchId = user.branchId;
            if (!branchId) {
                const { data: branch } = await supabase
                    .from('branches')
                    .select('id')
                    .limit(1)
                    .single();

                if (branch) {
                    branchId = branch.id;
                } else {
                    throw new Error('No branch found. Please contact support.');
                }
            }

            const invoice = await invoicesService.createInvoice({
                customer_id: selectedCustomer.id,
                branch_id: branchId!,
                items: cart,
                subtotal,
                discount,
                promo_code: promoCode || undefined,
                tax,
                total,
                payment_method: 'Cash', // Default for now, can be dynamic
                created_by: user.id
            });

            // If promo code was used, increment usage
            if (promoCode && discount > 0) {
                await invoicesService.incrementPromoUsage(promoCode);
            }

            // Record visit for customer
            await customersService.recordVisit(selectedCustomer.id, total);

            showToast('Payment processed successfully!', 'success');

            // Prepare for receipt
            setLastInvoice({
                ...invoice,
                customer: selectedCustomer,
                items: cart,
                subtotal,
                discount,
                tax,
                total
            });
            setShowReceipt(true);

            // Reset cart
            setCart([]);
            setDiscount(0);
            setPromoCode('');
            setSelectedCustomer(null);
            setCustomerSearch('');
        } catch (error: any) {
            console.error('Error processing payment:', error);
            showToast('Payment failed: ' + error.message, 'error');
        } finally {
            setProcessingPayment(false);
        }
    };

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal - discount + tax;

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(serviceSearch.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">POS & Billing</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Process payments and generate invoices</p>
                </div>
                {lastInvoice && (
                    <Button variant="outline" onClick={() => setShowReceipt(true)} leftIcon={<Printer className="h-4 w-4" />}>
                        Last Receipt
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Services & Customer */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Search */}
                    <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer</h2>
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="Search customer by phone or name..."
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                leftIcon={<Search className="h-5 w-5" />}
                            />
                            {customers.length > 0 && !selectedCustomer && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                    {customers.map(customer => (
                                        <button
                                            key={customer.id}
                                            className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            onClick={() => {
                                                setSelectedCustomer(customer);
                                                setCustomerSearch(customer.name);
                                                setCustomers([]);
                                            }}
                                        >
                                            <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>
                                                {customer.last_invoice && (
                                                    <span className="text-xs font-medium text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20 px-2 py-0.5 rounded-full">
                                                        Last Bill: {formatCurrency(customer.last_invoice.total)}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedCustomer && (
                            <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-primary-900 dark:text-primary-100">{selectedCustomer.name}</p>
                                    <p className="text-sm text-primary-700 dark:text-primary-300">{selectedCustomer.phone}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => {
                                    setSelectedCustomer(null);
                                    setCustomerSearch('');
                                }}>Change</Button>
                            </div>
                        )}
                    </div>

                    {/* Services */}
                    <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Services</h2>
                        <Input
                            type="text"
                            placeholder="Search services..."
                            value={serviceSearch}
                            onChange={(e) => setServiceSearch(e.target.value)}
                            leftIcon={<Search className="h-5 w-5" />}
                        />
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                            {filteredServices.map((service) => (
                                <button
                                    key={service.id}
                                    onClick={() => addToCart(service)}
                                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 text-left"
                                >
                                    <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatCurrency(service.price)}</p>
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
                                value={manualItem.description}
                                onChange={(e) => setManualItem({ ...manualItem, description: e.target.value })}
                            />
                            <Input
                                type="number"
                                placeholder="Amount"
                                label="Amount (Rs)"
                                value={manualItem.price}
                                onChange={(e) => setManualItem({ ...manualItem, price: e.target.value })}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            leftIcon={<Plus className="h-4 w-4" />}
                            onClick={addManualItem}
                        >
                            Add to Bill
                        </Button>
                    </div>
                </div>

                {/* Right: Bill Summary */}
                <div className="lg:col-span-1">
                    <div className="card p-6 sticky top-24 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                                    <ShoppingCart className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bill Summary</h2>
                            </div>
                            {cart.length > 0 && (
                                <button
                                    onClick={clearCart}
                                    className="text-sm text-danger-600 hover:text-danger-700 flex items-center gap-1"
                                >
                                    <RotateCcw className="h-3 w-3" /> Clear
                                </button>
                            )}
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
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(item.price * item.quantity)}
                                            </p>
                                            <button
                                                onClick={() => removeFromCart(index)}
                                                className="text-gray-400 hover:text-danger-500 transition-colors"
                                            >
                                                &times;
                                            </button>
                                        </div>
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
                                <Button variant="outline" size="md" onClick={handleApplyPromo}>Apply</Button>
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

                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full"
                            onClick={handlePayment}
                            disabled={processingPayment || cart.length === 0 || !selectedCustomer}
                        >
                            {processingPayment ? 'Processing...' : 'Complete Payment'}
                        </Button>

                        {/* Recent Invoices Section */}
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                            <RecentInvoices />
                        </div>
                    </div>
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceipt && lastInvoice && (
                <ReceiptModal
                    isOpen={showReceipt}
                    onClose={() => setShowReceipt(false)}
                    invoice={lastInvoice}
                />
            )}
        </div>
    );
}

function RecentInvoices() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    useEffect(() => {
        loadRecentInvoices();

        // Subscribe to new invoices
        const subscription = supabase
            .channel('recent_invoices')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'invoices' }, () => {
                loadRecentInvoices();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const loadRecentInvoices = async () => {
        try {
            const data = await invoicesService.getInvoices({ limit: 5 });
            setInvoices(data || []);
        } catch (error) {
            console.error('Error loading recent invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col w-full">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" />
                        Recent Transactions
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">Last 5</span>
                </div>

                <div className="overflow-y-auto flex-1 p-3 space-y-2 max-h-[300px]">
                    {loading ? (
                        <div className="text-center py-8 text-sm text-gray-500">Loading...</div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-500">No recent invoices</div>
                    ) : (
                        invoices.map((invoice) => (
                            <div
                                key={invoice.id}
                                onClick={() => setSelectedInvoice(invoice)}
                                className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                                        #{invoice.id.slice(0, 8)}
                                    </span>
                                    <span className="font-bold text-primary-600 dark:text-primary-400 text-sm">
                                        {formatCurrency(invoice.total)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                    <span className="truncate max-w-[120px]">
                                        {invoice.customer?.name || 'Walk-in Customer'}
                                    </span>
                                    <span>
                                        {new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {selectedInvoice && (
                <ReceiptModal
                    isOpen={!!selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    invoice={selectedInvoice}
                />
            )}
        </>
    );
}
