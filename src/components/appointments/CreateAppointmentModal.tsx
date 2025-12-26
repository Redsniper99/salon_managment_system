'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, User, Scissors, CheckCircle, Users, UserCheck, Search, Phone, Loader2 } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import PhoneInput from '@/components/shared/PhoneInput';
import { appointmentsService } from '@/services/appointments';
import { customersService } from '@/services/customers';
import { servicesService } from '@/services/services';
import { staffService } from '@/services/staff';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import TimeSlotPicker from '@/components/scheduling/TimeSlotPicker';
import AvailableStylistsView from './AvailableStylistsView';

interface CreateAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function CreateAppointmentModal({ isOpen, onClose, onSuccess }: CreateAppointmentModalProps) {
    const { user } = useAuth();
    const [step, setStep] = useState<'selection' | 'review'>('selection');
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerGender: 'Female' as 'Male' | 'Female' | 'Other',
        customerPreferences: '',
        date: '',
        time: '',
        serviceId: '',
        stylistId: '',
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [stylists, setStylists] = useState<any[]>([]);
    const [hasStylistPreference, setHasStylistPreference] = useState<boolean | null>(null);
    const [selectedStylistName, setSelectedStylistName] = useState('');

    // Customer lookup state
    const [customerLookupStatus, setCustomerLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
    const [existingCustomer, setExistingCustomer] = useState<any>(null);
    const [isCustomerLocked, setIsCustomerLocked] = useState(false);

    // Debounced phone lookup - auto search when phone has 9+ digits
    useEffect(() => {
        // Don't search if already locked (customer found)
        if (isCustomerLocked) return;

        // Need at least 9 digits to search
        if (!formData.customerPhone || formData.customerPhone.length < 9) {
            setCustomerLookupStatus('idle');
            setExistingCustomer(null);
            return;
        }

        setCustomerLookupStatus('searching');

        // Debounce the search by 500ms
        const timeoutId = setTimeout(async () => {
            try {
                const customer = await customersService.getCustomerByPhone(formData.customerPhone);
                if (customer) {
                    setExistingCustomer(customer);
                    setCustomerLookupStatus('found');
                    // Auto-fill customer data
                    setFormData(prev => ({
                        ...prev,
                        customerName: customer.name || '',
                        customerEmail: customer.email || '',
                        customerGender: customer.gender || 'Female',
                        customerPreferences: customer.preferences || '',
                    }));
                    setIsCustomerLocked(true);
                } else {
                    setCustomerLookupStatus('not_found');
                    setExistingCustomer(null);
                    setIsCustomerLocked(false);
                }
            } catch (error) {
                console.error('Error looking up customer:', error);
                setCustomerLookupStatus('not_found');
                setExistingCustomer(null);
                setIsCustomerLocked(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.customerPhone, isCustomerLocked]);

    // Fetch services when modal opens and reset state
    useEffect(() => {
        if (isOpen) {
            fetchServices();
            setStylists([]); // Clear stylists until service is selected
            setStep('selection'); // Reset step on open
            setHasStylistPreference(null); // Reset preference on open
            setSelectedStylistName('');
            // Reset customer lookup state
            setCustomerLookupStatus('idle');
            setExistingCustomer(null);
            setIsCustomerLocked(false);
        }
    }, [isOpen]);

    const fetchServices = async () => {
        try {
            const data = await servicesService.getServices();
            setServices(data || []);
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    const fetchStylists = async (serviceId?: string) => {
        try {
            let data;
            if (serviceId) {
                // Filter stylists by service capability
                data = await staffService.getStylistsByService(serviceId, undefined, formData.date || undefined);
            } else {
                // Get all stylists (fallback)
                data = await staffService.getStylists(undefined, formData.date || undefined);
            }
            setStylists(data || []);
        } catch (error) {
            console.error('Error fetching stylists:', error);
        }
    };

    // Refresh stylists when date or service changes (only when user has stylist preference)
    useEffect(() => {
        if (formData.date && formData.serviceId && hasStylistPreference === true) {
            fetchStylists(formData.serviceId);
        }
    }, [formData.date, formData.serviceId, hasStylistPreference]);

    const handleReview = (e: React.FormEvent) => {
        e.preventDefault();
        setStep('review');
    };

    const handleSubmit = async () => {
        if (!user) {
            alert('You must be logged in');
            return;
        }

        setLoading(true);
        try {
            // Check if customer exists or create new one
            let customer = await customersService.getCustomerByPhone(formData.customerPhone);

            if (!customer) {
                // Create new customer with full details
                customer = await customersService.createCustomer({
                    name: formData.customerName,
                    phone: formData.customerPhone,
                    email: formData.customerEmail || undefined,
                    gender: formData.customerGender,
                    preferences: formData.customerPreferences || undefined,
                });
            }

            // Get service duration
            const selectedService = services.find(s => s.id === formData.serviceId);
            const duration = selectedService?.duration || 60;

            // Get branch ID
            let branchId = user.branchId;
            if (!branchId) {
                // If user has no branch, try to get the default one
                const { data: branches } = await supabase
                    .from('branches')
                    .select('id')
                    .limit(1)
                    .single();

                if (branches) {
                    branchId = branches.id;
                } else {
                    throw new Error('No branch found. Please contact support.');
                }
            }

            // Create appointment
            await appointmentsService.createAppointment({
                customer_id: customer.id,
                stylist_id: formData.stylistId,
                branch_id: branchId!,
                services: [formData.serviceId],
                appointment_date: formData.date,
                start_time: formData.time,
                duration,
                notes: formData.notes || undefined,
            });

            // Reset form and close
            setFormData({
                customerName: '',
                customerPhone: '',
                customerEmail: '',
                customerGender: 'Female',
                customerPreferences: '',
                date: '',
                time: '',
                serviceId: '',
                stylistId: '',
                notes: '',
            });
            // Reset customer lookup state
            setCustomerLookupStatus('idle');
            setExistingCustomer(null);
            setIsCustomerLocked(false);
            setStep('selection');
            onClose();
            onSuccess?.();
        } catch (error: any) {
            console.error('Error creating appointment:', JSON.stringify(error, null, 2));
            alert(error.message || 'Failed to create appointment');
        } finally {
            setLoading(false);
        }
    };

    const selectedService = services.find(s => s.id === formData.serviceId);
    const selectedStylist = stylists.find(s => s.id === formData.stylistId);

    const formatTime = (time: string) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={step === 'review' ? "Review Appointment" : "New Appointment"}
            size="lg"
        >
            {step === 'selection' ? (
                <form onSubmit={handleReview} className="space-y-3">
                    {/* Phone Number First - with auto lookup */}
                    <div className="space-y-2">
                        <div className="relative">
                            <PhoneInput
                                label="Phone Number"
                                value={formData.customerPhone}
                                onChange={(value) => {
                                    setFormData({ ...formData, customerPhone: value });
                                    // Clear previous customer data if phone changes
                                    if (isCustomerLocked) {
                                        setIsCustomerLocked(false);
                                        setExistingCustomer(null);
                                        setCustomerLookupStatus('idle');
                                        setFormData(prev => ({
                                            ...prev,
                                            customerPhone: value,
                                            customerName: '',
                                            customerEmail: '',
                                            customerGender: 'Female',
                                            customerPreferences: '',
                                        }));
                                    }
                                }}
                                required
                            />
                            {/* Searching indicator */}
                            {customerLookupStatus === 'searching' && (
                                <div className="absolute right-3 top-9 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-xs">Searching...</span>
                                </div>
                            )}
                        </div>

                        {/* Customer lookup status message */}
                        {customerLookupStatus === 'found' && existingCustomer && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl"
                            >
                                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                        Welcome back, {existingCustomer.name}!
                                    </p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                        Customer found • {existingCustomer.total_visits || 0} previous visits
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setIsCustomerLocked(false);
                                        setCustomerLookupStatus('idle');
                                    }}
                                    className="text-emerald-600 dark:text-emerald-400"
                                >
                                    Edit
                                </Button>
                            </motion.div>
                        )}

                        {customerLookupStatus === 'not_found' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
                            >
                                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    New customer! Please fill in their details below.
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {/* Row 1: Name and Email */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                            label="Customer Name"
                            type="text"
                            value={formData.customerName}
                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                            placeholder="Enter customer name"
                            leftIcon={<User className="h-4 w-4" />}
                            required
                            disabled={isCustomerLocked}
                            className={isCustomerLocked ? '!border-emerald-500 dark:!border-emerald-600' : ''}
                        />
                        <Input
                            label="Email (Optional)"
                            type="email"
                            value={formData.customerEmail}
                            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                            placeholder="customer@email.com"
                            disabled={isCustomerLocked}
                            className={isCustomerLocked ? '!border-emerald-500 dark:!border-emerald-600' : ''}
                        />
                    </div>

                    {/* Row 2: Date, Service, Gender */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                            label="Date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            leftIcon={<Calendar className="h-4 w-4" />}
                            min={new Date().toISOString().split('T')[0]}
                            required
                        />

                        {/* Service */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Service
                            </label>
                            <select
                                value={formData.serviceId}
                                onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900 dark:text-white text-base"
                                required
                            >
                                <option value="">Select service</option>
                                {services.map((service) => (
                                    <option key={service.id} value={service.id}>
                                        {service.name} - Rs {service.price}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Gender
                            </label>
                            <select
                                value={formData.customerGender}
                                onChange={(e) => setFormData({ ...formData, customerGender: e.target.value as 'Male' | 'Female' | 'Other' })}
                                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base ${isCustomerLocked
                                    ? 'border-emerald-500 dark:border-emerald-600 cursor-not-allowed'
                                    : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                disabled={isCustomerLocked}
                            >
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Stylist Preference Toggle - shown after service is selected */}
                    {formData.serviceId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Stylist preference?
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setHasStylistPreference(true);
                                        setFormData({ ...formData, stylistId: '', time: '' });
                                        setSelectedStylistName('');
                                    }}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${hasStylistPreference === true
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <UserCheck className="w-4 h-4" />
                                    <span>Yes</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setHasStylistPreference(false);
                                        setFormData({ ...formData, stylistId: '', time: '' });
                                        setSelectedStylistName('');
                                    }}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${hasStylistPreference === false
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <Users className="w-4 h-4" />
                                    <span>No, show available</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Specific Stylist Selection - shown when user has preference */}
                    {formData.serviceId && hasStylistPreference === true && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Stylist
                            </label>
                            <select
                                value={formData.stylistId}
                                onChange={(e) => {
                                    const stylist = stylists.find(s => s.id === e.target.value);
                                    setFormData({ ...formData, stylistId: e.target.value, time: '' });
                                    setSelectedStylistName(stylist?.name || '');
                                }}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900 dark:text-white text-sm"
                                required={hasStylistPreference === true}
                            >
                                <option value="">Select stylist</option>
                                {stylists.map((stylist) => (
                                    <option key={stylist.id} value={stylist.id}>
                                        {stylist.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Time Slot Picker - shown when user has specific stylist preference */}
                    {formData.date && formData.stylistId && formData.serviceId && hasStylistPreference === true && (
                        <div className="col-span-full">
                            <TimeSlotPicker
                                stylistId={formData.stylistId}
                                date={formData.date}
                                serviceDuration={services.find(s => s.id === formData.serviceId)?.duration || 60}
                                onSelect={(time) => setFormData({ ...formData, time })}
                                selectedTime={formData.time}
                            />
                            {/* Hidden required input to enforce time selection */}
                            <input
                                type="text"
                                value={formData.time}
                                required
                                className="opacity-0 h-0 w-0 absolute"
                                onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Please select a time slot')}
                                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                            />
                        </div>
                    )}

                    {/* Available Stylists View - shown when user has no preference */}
                    {formData.date && formData.serviceId && hasStylistPreference === false && (
                        <div className="col-span-full">
                            <AvailableStylistsView
                                serviceId={formData.serviceId}
                                serviceName={services.find(s => s.id === formData.serviceId)?.name || ''}
                                serviceDuration={services.find(s => s.id === formData.serviceId)?.duration || 60}
                                date={formData.date}
                                onSelect={(stylistId, time, stylistName) => {
                                    setFormData({ ...formData, stylistId, time });
                                    setSelectedStylistName(stylistName);
                                }}
                                branchId={user?.branchId}
                            />
                            {/* Hidden required inputs */}
                            <input
                                type="text"
                                value={formData.stylistId}
                                required
                                className="opacity-0 h-0 w-0 absolute"
                                onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Please select a stylist')}
                                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                            />
                            <input
                                type="text"
                                value={formData.time}
                                required
                                className="opacity-0 h-0 w-0 absolute"
                                onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Please select a time slot')}
                                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                            />
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Add any special notes..."
                            rows={3}
                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Review Appointment
                        </Button>
                    </div>
                </form>
            ) : (
                <div className="space-y-6">
                    {/* Review Summary */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer</h4>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">{formData.customerName}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{formData.customerPhone}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Stylist</h4>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedStylist?.name}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Date & Time</h4>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">{formatDate(formData.date)}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{formatTime(formData.time)}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Service</h4>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedService?.name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedService?.duration} mins</p>
                            </div>
                        </div>

                        {formData.notes && (
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{formData.notes}</p>
                            </div>
                        )}

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                            <span className="text-lg font-medium text-gray-900 dark:text-white">Total Price</span>
                            <span className="text-2xl font-bold text-primary-600">Rs {selectedService?.price}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep('selection')}
                            disabled={loading}
                        >
                            Back to Edit
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={loading}
                            leftIcon={loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Clock className="h-5 w-5" /></motion.div> : <CheckCircle className="h-5 w-5" />}
                        >
                            {loading ? 'Confirming...' : 'Confirm Booking'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
