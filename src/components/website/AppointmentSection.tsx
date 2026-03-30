'use client';

import { useState, useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/utils/gsapConfig';
import { useWebsiteAuth } from '@/context/WebsiteAuthContext';
import {
    fetchServices,
    fetchStylistsForService,
    fetchTimeSlots,
    fetchConsolidatedAvailability,
    createBooking,
    formatTime,
    getMinDate,
    type Service,
    type Stylist,
    type TimeSlot,
    type ConsolidatedSlot,
} from '@/lib/website/api';

interface BookingData {
    id: string;
    service: string;
    serviceName: string;
    servicePrice: number;
    serviceDuration: number;
    wantsStylist: 'yes' | 'no' | '';
    stylist: string;
    stylistName: string;
    date: string;
    time: string;
}

interface CustomerData {
    name: string;
    email: string;
    phone: string;
    notes: string;
}

const steps = [
    { id: 1, title: 'Service', icon: '✂️', subtitle: 'Choose your treatment' },
    { id: 2, title: 'Review', icon: '📋', subtitle: 'Your appointments' },
    { id: 3, title: 'Details', icon: '📝', subtitle: 'Your information' },
    { id: 4, title: 'Verify', icon: '📱', subtitle: 'OTP verification' },
    { id: 5, title: 'Confirm', icon: '✓', subtitle: 'Submit booking' },
];

const serviceCategories = [
    { id: 'all', name: 'All', icon: '✨' },
    { id: 'Hair', name: 'Hair', icon: '✂️' },
    { id: 'Spa', name: 'Skin & Spa', icon: '💆' },
    { id: 'Nails', name: 'Nails', icon: '💅' },
    { id: 'Bridal', name: 'Bridal', icon: '👰' },
];


const generateId = () => `booking-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

interface AppointmentSectionProps {
    isStandalone?: boolean;
}

export default function AppointmentSection({ isStandalone = false }: AppointmentSectionProps) {
    const { setSession, isAuthenticated, getAuthenticatedClient } = useWebsiteAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const sectionRef = useRef<HTMLElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // API Data States
    const [services, setServices] = useState<Service[]>([]);
    const [stylists, setStylists] = useState<Stylist[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [consolidatedSlots, setConsolidatedSlots] = useState<ConsolidatedSlot[]>([]);
    const [stylistUnavailabilityMessage, setStylistUnavailabilityMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Multi-Booking States
    const [cart, setCart] = useState<BookingData[]>([]);
    const [customer, setCustomer] = useState<CustomerData>({ name: '', email: '', phone: '', notes: '' });
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // OTP States
    const [otpSent, setOtpSent] = useState(false);
    const [otpValue, setOtpValue] = useState('');
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    const [otpCountdown, setOtpCountdown] = useState(0);

    // Booking success state
    const [bookingSuccess, setBookingSuccess] = useState<{
        show: boolean;
        appointments: { serviceName: string; date: string; time: string; price: number }[];
        total: number;
    } | null>(null);

    // Form validation states
    const [fieldErrors, setFieldErrors] = useState<{
        name?: string;
        phone?: string;
        email?: string;
    }>({});
    const [showErrors, setShowErrors] = useState(false);

    // Current service being configured (before adding to cart)
    const [configuring, setConfiguring] = useState<{
        service: Service | null;
        wantsStylist: 'yes' | 'no' | '';
        stylist: string;
        stylistName: string;
        date: string;
        time: string;
    }>({
        service: null,
        wantsStylist: '',
        stylist: '',
        stylistName: '',
        date: '',
        time: '',
    });

    // Modal state for configuring appointment
    const [showModal, setShowModal] = useState(false);
    const [modalStep, setModalStep] = useState(1); // 1: preference, 2: stylist, 3: date/time

    // Get total price
    const totalPrice = cart.reduce((sum, item) => sum + item.servicePrice, 0);
    const totalDuration = cart.reduce((sum, item) => sum + item.serviceDuration, 0);

    // Calculate time slots blocked by cart items for a specific date
    const getCartBlockedSlots = (date: string): { time: string; endTime: string; serviceName: string }[] => {
        return cart
            .filter(item => item.date === date)
            .map(item => {
                // Calculate end time based on service duration
                const [hours, mins] = item.time.split(':').map(Number);
                const endMinutes = hours * 60 + mins + item.serviceDuration;
                const endHours = Math.floor(endMinutes / 60);
                const endMins = endMinutes % 60;
                const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                return { time: item.time, endTime, serviceName: item.serviceName };
            });
    };

    // Check if a time slot overlaps with cart bookings
    const isSlotBlockedByCart = (
        slotTime: string,
        serviceDuration: number,
        cartBlocked: { time: string; endTime: string; serviceName: string }[]
    ): { blocked: boolean; conflictWith?: string } => {
        const [slotHour, slotMin] = slotTime.split(':').map(Number);
        const slotStartMinutes = slotHour * 60 + slotMin;
        const slotEndMinutes = slotStartMinutes + serviceDuration;

        for (const cartItem of cartBlocked) {
            const [cartStartHour, cartStartMin] = cartItem.time.split(':').map(Number);
            const [cartEndHour, cartEndMin] = cartItem.endTime.split(':').map(Number);
            const cartStartMinutes = cartStartHour * 60 + cartStartMin;
            const cartEndMinutes = cartEndHour * 60 + cartEndMin;

            // Check for overlap: slot overlaps if it starts before cart ends AND ends after cart starts
            if (slotStartMinutes < cartEndMinutes && slotEndMinutes > cartStartMinutes) {
                return { blocked: true, conflictWith: cartItem.serviceName };
            }
        }
        return { blocked: false };
    };

    // Navigation functions
    const goBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const goNext = () => {
        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    // Validation functions
    const validateName = (name: string): string | undefined => {
        if (!name.trim()) return 'Name is required';
        if (name.trim().length < 2) return 'Name must be at least 2 characters';
        if (name.trim().length > 100) return 'Name is too long';
        return undefined;
    };

    const validatePhone = (phone: string): string | undefined => {
        if (!phone.trim()) return 'Phone is required';
        // Remove all non-digits for validation
        const digits = phone.replace(/\D/g, '');
        // Sri Lanka: 10 digits starting with 0 or 9 digits without 0, or with country code
        if (digits.length < 9 || digits.length > 12) {
            return 'Enter a valid phone number';
        }
        // Check if it's a valid Sri Lanka number pattern
        if (!digits.match(/^(94|0)?[0-9]{9}$/)) {
            return 'Enter a valid Sri Lanka phone number';
        }
        return undefined;
    };

    const validateEmail = (email: string): string | undefined => {
        if (!email.trim()) return undefined; // Optional field
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return 'Enter a valid email address';
        }
        return undefined;
    };

    const validateCustomerForm = (): boolean => {
        const errors: { name?: string; phone?: string; email?: string } = {};

        errors.name = validateName(customer.name);
        errors.phone = validatePhone(customer.phone);
        errors.email = validateEmail(customer.email);

        setFieldErrors(errors);
        setShowErrors(true);

        return !errors.name && !errors.phone && !errors.email;
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1: {
                // Check if a service is fully configured (for service selection step)
                return configuring.service && configuring.date && configuring.time;
            }
            case 2: {
                // Review step - check if there are appointments in the list
                return cart.length > 0;
            }
            case 3: {
                // Details step - validate customer form
                const nameErr = validateName(customer.name);
                const phoneErr = validatePhone(customer.phone);
                const emailErr = validateEmail(customer.email);
                return !nameErr && !phoneErr && !emailErr;
            }
            case 4: return otpVerified;
            default: return true;
        }
    };

    // OTP Countdown timer
    useEffect(() => {
        if (otpCountdown > 0) {
            const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [otpCountdown]);

    // Send OTP function
    const sendOtp = async () => {
        if (!customer.phone) return;

        setOtpLoading(true);
        setOtpError(null);

        try {
            const response = await fetch('/api/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: customer.phone }),
            });

            const data = await response.json();

            if (data.success) {
                setOtpSent(true);
                setOtpCountdown(60); // 60 second cooldown
                // For development, show OTP in console
                if (data.debug_otp) {
                    console.log('DEBUG OTP:', data.debug_otp);
                }
            } else {
                setOtpError(data.error || 'Failed to send OTP');
            }
        } catch (err) {
            setOtpError('Failed to send OTP. Please try again.');
        } finally {
            setOtpLoading(false);
        }
    };

    // Verify OTP function
    const verifyOtp = async () => {
        if (!otpValue || otpValue.length !== 6) {
            setOtpError('Please enter a valid 6-digit OTP');
            return;
        }

        setOtpLoading(true);
        setOtpError(null);

        try {
            const response = await fetch('/api/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: customer.phone, otp: otpValue }),
            });

            const data = await response.json();

            if (data.success) {
                setOtpVerified(true);
                // Save session from server response
                if (data.session) {
                    setSession(data.session);
                }
                goNext(); // Auto-advance to confirmation
            } else {
                setOtpError(data.error || 'Invalid OTP');
            }
        } catch (err) {
            setOtpError('Failed to verify OTP. Please try again.');
        } finally {
            setOtpLoading(false);
        }
    };

    // Mount effects
    useEffect(() => {
        setIsMounted(true);
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Fetch services on mount
    useEffect(() => {
        async function loadServices() {
            try {
                setLoading(true);
                const data = await fetchServices();
                setServices(data);
                setError(null);
            } catch (err) {
                console.error('Error loading services:', err);
                setError('Failed to load services. Please refresh the page.');
            } finally {
                setLoading(false);
            }
        }
        loadServices();
    }, []);

    // Fetch stylists when configuring a service
    useEffect(() => {
        if (!configuring.service || configuring.wantsStylist !== 'yes') {
            return;
        }

        async function loadStylists() {
            try {
                setLoading(true);
                const data = await fetchStylistsForService(configuring.service!.id, configuring.date);
                setStylists(data);
                setError(null);
            } catch (err) {
                console.error('Error loading stylists:', err);
                setError('Failed to load stylists.');
            } finally {
                setLoading(false);
            }
        }
        loadStylists();
    }, [configuring.service, configuring.wantsStylist, configuring.date]);

    // Fetch time slots when date is selected
    useEffect(() => {
        if (!configuring.date || !configuring.service) {
            setTimeSlots([]);
            setConsolidatedSlots([]);
            return;
        }

        const isNoPreference = configuring.wantsStylist === 'no' || configuring.stylist === 'any';

        async function loadAvailability() {
            try {
                setLoading(true);
                setStylistUnavailabilityMessage(null);

                if (isNoPreference) {
                    const data = await fetchConsolidatedAvailability(
                        configuring.service!.id,
                        configuring.date,
                        configuring.service!.duration
                    );
                    setConsolidatedSlots(data.slots);
                    setTimeSlots([]);
                } else if (configuring.stylist && configuring.stylist !== 'any') {
                    const response = await fetchTimeSlots(
                        configuring.stylist,
                        configuring.date,
                        configuring.service!.duration
                    );
                    setTimeSlots(response.slots);
                    setConsolidatedSlots([]);

                    // Set unavailability message if stylist is on holiday or doesn't work this day
                    if (response.unavailabilityReason) {
                        setStylistUnavailabilityMessage(response.unavailabilityReason);
                    }
                }

                setError(null);
            } catch (err) {
                console.error('Error loading availability:', err);
                setError('Failed to load available times.');
            } finally {
                setLoading(false);
            }
        }
        loadAvailability();
    }, [configuring.service, configuring.date, configuring.stylist, configuring.wantsStylist]);

    // ScrollTrigger for pinning
    useEffect(() => {
        if (!isMounted || !sectionRef.current) return;

        let ctx: gsap.Context | null = null;

        const timer = setTimeout(() => {
            const section = sectionRef.current;
            if (!section) return;

            ctx = gsap.context(() => {
                ScrollTrigger.create({
                    trigger: section,
                    start: 'top top',
                    end: `+=${steps.length * 500}`,
                    pin: true,
                    pinSpacing: true,
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                    scrub: isMobile ? 1 : false,
                    onUpdate: isMobile ? (self) => {
                        const progress = self.progress;
                        const stepIndex = Math.floor(progress * steps.length);
                        const newStep = Math.min(Math.max(stepIndex + 1, 1), steps.length);
                        setCurrentStep(prev => prev !== newStep ? newStep : prev);
                    } : undefined,
                });
            }, section);
        }, 300);

        return () => {
            clearTimeout(timer);
            if (ctx) ctx.revert();
        };
    }, [isMounted, isMobile]);

    // Open modal to configure a service
    const openServiceModal = (service: Service) => {
        setConfiguring({
            service,
            wantsStylist: '',
            stylist: '',
            stylistName: '',
            date: '',
            time: '',
        });
        setModalStep(1);
        setShowModal(true);
    };

    // Add configured service to appointments list
    const addToAppointments = () => {
        if (!configuring.service || !configuring.date || !configuring.time) return;

        const newBooking: BookingData = {
            id: generateId(),
            service: configuring.service.id,
            serviceName: configuring.service.name,
            servicePrice: configuring.service.price,
            serviceDuration: configuring.service.duration,
            wantsStylist: configuring.wantsStylist,
            stylist: configuring.stylist,
            stylistName: configuring.stylistName || 'Any Available',
            date: configuring.date,
            time: configuring.time,
        };

        setCart(prev => [...prev, newBooking]);
        setShowModal(false);
        setConfiguring({
            service: null,
            wantsStylist: '',
            stylist: '',
            stylistName: '',
            date: '',
            time: '',
        });

        // Always navigate to Review step after adding appointment
        setCurrentStep(2);
    };

    // Remove from cart
    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    // Handle booking submission - submits each appointment separately
    const handleSubmit = async () => {
        if (cart.length === 0) return;

        try {
            setLoading(true);
            setError(null);

            // Get authenticated Supabase client
            const authClient = getAuthenticatedClient();
            const results: { date: string; time: string; serviceName: string; price: number }[] = [];

            // Submit each appointment separately
            for (const booking of cart) {
                const isNoPreference = booking.wantsStylist === 'no' || booking.stylist === 'any';
                const stylistId = isNoPreference ? 'NO_PREFERENCE' : booking.stylist;

                const result = await createBooking({
                    customer: {
                        name: customer.name,
                        phone: customer.phone,
                        email: customer.email || undefined,
                    },
                    appointment: {
                        service_id: booking.service,
                        stylist_id: stylistId,
                        date: booking.date,
                        time: booking.time,
                        notes: customer.notes || undefined,
                    }
                }, authClient);

                results.push({
                    date: result.date,
                    time: result.time,
                    serviceName: booking.serviceName,
                    price: booking.servicePrice,
                });
            }

            // Send confirmation SMS with all appointments
            try {
                await fetch('/api/sms/confirmation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: customer.phone,
                        appointments: results,
                        totalPrice,
                    }),
                });
                console.log('✅ Confirmation SMS sent');
            } catch (smsErr) {
                console.error('Failed to send confirmation SMS:', smsErr);
                // Don't fail the booking if SMS fails
            }

            // Show success message on screen
            const successData = {
                show: true,
                appointments: results,
                total: totalPrice,
            };
            setBookingSuccess(successData);

            // Reset form
            setCart([]);
            setConfiguring({
                service: null,
                wantsStylist: '',
                stylist: '',
                stylistName: '',
                date: '',
                time: '',
            });
            setOtpSent(false);
            setOtpValue('');
            setOtpVerified(false);
            setCurrentStep(1);

        } catch (err: any) {
            console.error('Error submitting booking:', err);
            setError(err.message || 'Failed to create appointments. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Filter services by category
    const filteredServices = selectedCategory === 'all'
        ? services
        : services.filter(s => s.category === selectedCategory);

    // Navigation Buttons Component
    const NavButtons = ({ showBack = true, showNext = true }: { showBack?: boolean; showNext?: boolean }) => (
        <div className="flex items-center justify-between gap-4 mt-6">
            {showBack && currentStep > 1 ? (
                <button
                    onClick={goBack}
                    className="flex items-center gap-2 px-6 py-3 rounded-full border-2 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
            ) : (
                <div />
            )}
            {showNext && currentStep < steps.length && (
                <button
                    onClick={goNext}
                    disabled={!canProceed()}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${canProceed()
                        ? 'bg-gradient-to-r from-primary-400 to-primary-600 text-white shadow-[0_0_20px_rgba(116,150,116,0.4)] hover:scale-105'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                        }`}
                >
                    Next
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}
        </div>
    );

    // Render modal content for configuring a service
    const renderModalContent = () => {
        if (!configuring.service) return null;

        switch (modalStep) {
            case 1: // Stylist Preference
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-bold text-white mb-2">Stylist Preference</h3>
                            <p className="text-white/60 text-sm">For: {configuring.service.name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => {
                                    setConfiguring(prev => ({ ...prev, wantsStylist: 'yes', stylist: '' }));
                                    setModalStep(2);
                                }}
                                className="p-4 rounded-xl text-center bg-white/5 border-2 border-white/10 hover:border-primary-400/50 transition-all"
                            >
                                <div className="text-3xl mb-2">👤</div>
                                <h4 className="font-semibold text-white text-sm">Choose Stylist</h4>
                            </button>

                            <button
                                onClick={() => {
                                    setConfiguring(prev => ({ ...prev, wantsStylist: 'no', stylist: 'any', stylistName: 'Any Available' }));
                                    setModalStep(3);
                                }}
                                className="p-4 rounded-xl text-center bg-white/5 border-2 border-white/10 hover:border-primary-400/50 transition-all"
                            >
                                <div className="text-3xl mb-2">👥</div>
                                <h4 className="font-semibold text-white text-sm">No Preference</h4>
                            </button>
                        </div>
                    </div>
                );

            case 2: // Stylist Selection
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-bold text-white mb-2">Select Stylist</h3>
                            <p className="text-white/60 text-sm">For: {configuring.service.name}</p>
                        </div>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full mx-auto"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                                {stylists.map(stylist => (
                                    <button
                                        key={stylist.id}
                                        onClick={() => {
                                            setConfiguring(prev => ({ ...prev, stylist: stylist.id, stylistName: stylist.name }));
                                            setModalStep(3);
                                        }}
                                        className="p-3 rounded-xl text-center bg-white/5 border-2 border-white/10 hover:border-primary-400/50 transition-all"
                                    >
                                        <div className="text-2xl mb-1">👩‍🦰</div>
                                        <h4 className="font-semibold text-white text-sm">{stylist.name}</h4>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setModalStep(1)}
                            className="text-white/60 text-sm hover:text-white"
                        >
                            ← Back
                        </button>
                    </div>
                );

            case 3: // Date & Time
                const isNoPreference = configuring.wantsStylist === 'no' || configuring.stylist === 'any';
                const slotsToShow = isNoPreference ? consolidatedSlots : timeSlots;

                return (
                    <div className="space-y-4">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-bold text-white mb-2">Select Date & Time</h3>
                            <p className="text-white/60 text-sm">
                                {configuring.service.name} with {configuring.stylistName}
                            </p>
                        </div>

                        <div>
                            <label className="block text-white/80 mb-2 text-sm font-medium">Date</label>
                            <input
                                type="date"
                                value={configuring.date}
                                onChange={(e) => setConfiguring(prev => ({ ...prev, date: e.target.value, time: '' }))}
                                min={getMinDate()}
                                style={{ colorScheme: 'dark' }}
                                className="w-full p-3 rounded-xl bg-white/5 border-2 border-white/10 text-white focus:border-primary-400 focus:outline-none"
                            />
                        </div>

                        {configuring.date && loading && (
                            <div className="text-center py-4">
                                <div className="animate-spin w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full mx-auto"></div>
                            </div>
                        )}

                        {/* Stylist Unavailability Notice */}
                        {configuring.date && !loading && stylistUnavailabilityMessage && slotsToShow.length === 0 && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                                <div className="text-amber-400 text-2xl mb-2">📅</div>
                                <p className="text-amber-300 font-medium">{stylistUnavailabilityMessage}</p>
                                <p className="text-white/60 text-sm mt-2">
                                    Please select a different date or choose another stylist.
                                </p>
                            </div>
                        )}

                        {configuring.date && !loading && slotsToShow.length > 0 && (
                            <div>
                                <label className="block text-white/80 mb-2 text-sm font-medium">Time</label>
                                {/* Legend for slot colors */}
                                <div className="flex flex-wrap gap-3 text-[10px] text-white/60 mb-3">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2.5 h-2.5 rounded bg-white/10 border border-white/20"></div>
                                        <span>Available</span>
                                    </div>
                                    {cart.length > 0 && (
                                        <div className="flex items-center gap-1">
                                            <div className="w-2.5 h-2.5 rounded bg-amber-900/30 border border-amber-500/30"></div>
                                            <span>In Your Cart</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <div className="w-2.5 h-2.5 rounded bg-red-900/20 border border-red-500/20"></div>
                                        <span>Booked</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                                    {slotsToShow.map(slot => {
                                        const cartBlocked = isSlotBlockedByCart(
                                            slot.time,
                                            configuring.service!.duration,
                                            getCartBlockedSlots(configuring.date)
                                        );
                                        const isDisabled = !slot.available || cartBlocked.blocked;

                                        return (
                                            <button
                                                key={slot.time}
                                                onClick={() => setConfiguring(prev => ({ ...prev, time: slot.time }))}
                                                disabled={isDisabled}
                                                title={cartBlocked.blocked ? `Conflicts with: ${cartBlocked.conflictWith}` : undefined}
                                                className={`p-2 rounded-lg text-xs font-medium transition-all ${configuring.time === slot.time
                                                    ? 'bg-primary-400 text-white'
                                                    : cartBlocked.blocked
                                                        ? 'bg-amber-900/30 text-amber-400/70 cursor-not-allowed border border-amber-500/30'
                                                        : slot.available
                                                            ? 'bg-white/10 text-white/80 hover:bg-primary-400/30'
                                                            : 'bg-red-900/20 text-red-400/50 cursor-not-allowed'
                                                    }`}
                                            >
                                                {formatTime(slot.time)}
                                                {cartBlocked.blocked && <span className="block text-[8px] opacity-70">🛒 In Cart</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setModalStep(configuring.wantsStylist === 'yes' ? 2 : 1)}
                                className="flex-1 px-4 py-2 rounded-full border-2 border-white/20 text-white/80 hover:bg-white/10"
                            >
                                Back
                            </button>
                            <button
                                onClick={addToAppointments}
                                disabled={!configuring.time}
                                className={`flex-1 px-4 py-2 rounded-full font-medium transition-all ${configuring.time
                                    ? 'bg-gradient-to-r from-primary-400 to-primary-600 text-white'
                                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                                    }`}
                            >
                                Add Appointment
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // Render step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1: // Service Selection
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-white mb-2">Choose Your Service</h3>
                            <p className="text-white/60">Select a service to book your appointment</p>
                        </div>

                        {/* Category Filter */}
                        <div className="flex flex-wrap gap-2 justify-center mb-6">
                            {serviceCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat.id
                                        ? 'bg-primary-400 text-white'
                                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                                        }`}
                                >
                                    {cat.icon} {cat.name}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full mx-auto"></div>
                                <p className="text-white/60 mt-2">Loading services...</p>
                            </div>
                        ) : (
                            <div className="max-h-[400px] overflow-y-auto themed-scrollbar rounded-xl">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
                                    {filteredServices.map(service => {
                                        const isSelected = configuring.service?.id === service.id;
                                        return (
                                            <button
                                                key={service.id}
                                                onClick={() => openServiceModal(service)}
                                                className={`p-4 rounded-xl text-left transition-all ${isSelected && configuring.date && configuring.time
                                                    ? 'bg-primary-400/30 border-2 border-primary-400'
                                                    : 'bg-white/5 border-2 border-white/10 hover:border-primary-400/50'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-white">{service.name}</h4>
                                                        <p className="text-sm text-white/60">{service.duration} mins</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-primary-400 font-bold">Rs {service.price}</span>
                                                        {isSelected && configuring.date && configuring.time && (
                                                            <span className="block text-xs text-primary-400">✓ Selected</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Selected Service Summary */}
                        {configuring.service && configuring.date && configuring.time && (
                            <div className="bg-white/5 rounded-xl p-4 border border-primary-400/30">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-xs text-primary-400 font-medium">Selected Appointment</span>
                                        <h4 className="font-semibold text-white">{configuring.service.name}</h4>
                                        <p className="text-sm text-white/60">
                                            {configuring.date} at {formatTime(configuring.time)} • {configuring.stylistName || 'Any Available'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-primary-400 font-bold">Rs {configuring.service.price}</span>
                                        <button
                                            onClick={() => setConfiguring({
                                                service: null,
                                                wantsStylist: '',
                                                stylist: '',
                                                stylistName: '',
                                                date: '',
                                                time: '',
                                            })}
                                            className="block text-xs text-red-400 hover:text-red-300 mt-1"
                                        >
                                            Change
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <NavButtons showBack={false} />
                    </div>
                );

            case 2: // Review Appointments
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-white mb-2">
                                Your {cart.length > 1 ? 'Appointments' : 'Appointment'}
                            </h3>
                            <p className="text-white/60">Review your selection{cart.length > 1 ? 's' : ''} before proceeding</p>
                        </div>

                        {cart.length === 0 ? (
                            <div className="text-center py-8 text-white/60">
                                <p>No appointments selected. Go back to add services.</p>
                            </div>
                        ) : (
                            <div className="max-w-lg mx-auto space-y-4">
                                {/* Appointments List */}
                                <div className="space-y-3">
                                    {cart.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className="bg-white/5 rounded-xl p-4 border border-white/10"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-xs text-primary-400">Appointment {index + 1}</span>
                                                    <h4 className="font-semibold text-white">{item.serviceName}</h4>
                                                    <p className="text-sm text-white/60">
                                                        {item.date} at {formatTime(item.time)} • {item.stylistName}
                                                    </p>
                                                    <p className="text-xs text-white/40 mt-1">{item.serviceDuration} mins</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-primary-400 font-bold">Rs {item.servicePrice}</span>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="block text-xs text-red-400 hover:text-red-300 mt-1"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Total */}
                                <div className="bg-primary-400/20 rounded-xl p-4 border border-primary-400/50">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-white font-semibold">Total ({cart.length} appointment{cart.length > 1 ? 's' : ''})</span>
                                            <span className="text-white/60 text-sm block">{totalDuration} mins</span>
                                        </div>
                                        <span className="text-primary-400 font-bold text-2xl">Rs {totalPrice}</span>
                                    </div>
                                </div>

                                {/* Add Another Appointment */}
                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="w-full p-4 rounded-xl border-2 border-dashed border-primary-400/50 hover:border-primary-400 bg-primary-400/5 hover:bg-primary-400/10 transition-all group"
                                >
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary-400/20 flex items-center justify-center group-hover:bg-primary-400/30 transition-colors">
                                            <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </div>
                                        <span className="text-primary-400 font-medium text-base">Add Another Appointment</span>
                                    </div>
                                </button>
                            </div>
                        )}

                        <NavButtons />
                    </div>
                );

            case 3: // Customer Details
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-white mb-2">Your Details</h3>
                            <p className="text-white/60">Enter your contact information</p>
                        </div>

                        <div className="max-w-md mx-auto space-y-4">
                            {/* Name Field */}
                            <div>
                                <label className="block text-white/80 mb-2 text-sm font-medium">Name *</label>
                                <input
                                    type="text"
                                    value={customer.name}
                                    onChange={(e) => {
                                        setCustomer(prev => ({ ...prev, name: e.target.value }));
                                        if (showErrors) {
                                            setFieldErrors(prev => ({ ...prev, name: validateName(e.target.value) }));
                                        }
                                    }}
                                    onBlur={() => {
                                        if (customer.name) {
                                            setFieldErrors(prev => ({ ...prev, name: validateName(customer.name) }));
                                            setShowErrors(true);
                                        }
                                    }}
                                    placeholder="Your full name"
                                    className={`w-full p-4 rounded-xl bg-white/5 border-2 text-white placeholder-white/40 focus:outline-none transition-all ${showErrors && fieldErrors.name
                                        ? 'border-red-500 focus:border-red-400'
                                        : 'border-white/10 focus:border-primary-400'
                                        }`}
                                />
                                {showErrors && fieldErrors.name && (
                                    <p className="text-red-400 text-sm mt-1">{fieldErrors.name}</p>
                                )}
                            </div>

                            {/* Phone Field */}
                            <div>
                                <label className="block text-white/80 mb-2 text-sm font-medium">Phone *</label>
                                <input
                                    type="tel"
                                    value={customer.phone}
                                    onChange={(e) => {
                                        setCustomer(prev => ({ ...prev, phone: e.target.value }));
                                        if (showErrors) {
                                            setFieldErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }));
                                        }
                                    }}
                                    onBlur={() => {
                                        if (customer.phone) {
                                            setFieldErrors(prev => ({ ...prev, phone: validatePhone(customer.phone) }));
                                            setShowErrors(true);
                                        }
                                    }}
                                    placeholder="+94 77 123 4567"
                                    className={`w-full p-4 rounded-xl bg-white/5 border-2 text-white placeholder-white/40 focus:outline-none transition-all ${showErrors && fieldErrors.phone
                                        ? 'border-red-500 focus:border-red-400'
                                        : 'border-white/10 focus:border-primary-400'
                                        }`}
                                />
                                {showErrors && fieldErrors.phone && (
                                    <p className="text-red-400 text-sm mt-1">{fieldErrors.phone}</p>
                                )}
                            </div>

                            {/* Email Field */}
                            <div>
                                <label className="block text-white/80 mb-2 text-sm font-medium">Email (Optional)</label>
                                <input
                                    type="email"
                                    value={customer.email}
                                    onChange={(e) => {
                                        setCustomer(prev => ({ ...prev, email: e.target.value }));
                                        if (showErrors) {
                                            setFieldErrors(prev => ({ ...prev, email: validateEmail(e.target.value) }));
                                        }
                                    }}
                                    onBlur={() => {
                                        if (customer.email) {
                                            setFieldErrors(prev => ({ ...prev, email: validateEmail(customer.email) }));
                                            setShowErrors(true);
                                        }
                                    }}
                                    placeholder="your@email.com"
                                    className={`w-full p-4 rounded-xl bg-white/5 border-2 text-white placeholder-white/40 focus:outline-none transition-all ${showErrors && fieldErrors.email
                                        ? 'border-red-500 focus:border-red-400'
                                        : 'border-white/10 focus:border-primary-400'
                                        }`}
                                />
                                {showErrors && fieldErrors.email && (
                                    <p className="text-red-400 text-sm mt-1">{fieldErrors.email}</p>
                                )}
                            </div>

                            {/* Notes Field */}
                            <div>
                                <label className="block text-white/80 mb-2 text-sm font-medium">Notes (Optional)</label>
                                <textarea
                                    value={customer.notes}
                                    onChange={(e) => setCustomer(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Any special requests..."
                                    rows={3}
                                    className="w-full p-4 rounded-xl bg-white/5 border-2 border-white/10 text-white placeholder-white/40 focus:border-primary-400 focus:outline-none transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Custom Next button with validation */}
                        <div className="flex items-center justify-between gap-4 mt-6">
                            <button
                                onClick={goBack}
                                className="flex items-center gap-2 px-6 py-3 rounded-full border-2 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>
                            <button
                                onClick={() => {
                                    if (validateCustomerForm()) {
                                        goNext();
                                    }
                                }}
                                disabled={!canProceed()}
                                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${canProceed()
                                    ? 'bg-gradient-to-r from-primary-400 to-primary-600 text-white shadow-[0_0_20px_rgba(116,150,116,0.4)] hover:scale-105'
                                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                                    }`}
                            >
                                Next
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                );

            case 4: // OTP Verification
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-white mb-2">Verify Your Phone</h3>
                            <p className="text-white/60">We&apos;ll send a verification code to {customer.phone}</p>
                        </div>

                        <div className="max-w-md mx-auto space-y-6">
                            {!otpSent ? (
                                // Send OTP Button
                                <div className="text-center">
                                    <button
                                        onClick={sendOtp}
                                        disabled={otpLoading}
                                        className="px-8 py-4 rounded-xl font-medium bg-gradient-to-r from-primary-400 to-primary-600 text-white shadow-[0_0_20px_rgba(116,150,116,0.4)] hover:scale-105 transition-all disabled:opacity-50"
                                    >
                                        {otpLoading ? (
                                            <span className="flex items-center gap-2">
                                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                Sending...
                                            </span>
                                        ) : (
                                            '📱 Send Verification Code'
                                        )}
                                    </button>
                                </div>
                            ) : (
                                // OTP Input
                                <div className="space-y-4">
                                    <div className="bg-primary-400/20 rounded-xl p-4 text-center border border-primary-400/30">
                                        <p className="text-primary-400 text-sm">
                                            ✓ Verification code sent to {customer.phone}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-white/80 mb-2 text-sm font-medium text-center">
                                            Enter 6-digit code
                                        </label>
                                        <input
                                            type="text"
                                            value={otpValue}
                                            onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            maxLength={6}
                                            className="w-full p-4 rounded-xl bg-white/5 border-2 border-white/10 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-white/40 focus:border-primary-400 focus:outline-none transition-all"
                                        />
                                    </div>

                                    <button
                                        onClick={verifyOtp}
                                        disabled={otpLoading || otpValue.length !== 6}
                                        className={`w-full py-4 rounded-xl font-medium transition-all ${otpValue.length === 6
                                            ? 'bg-gradient-to-r from-primary-400 to-primary-600 text-white hover:scale-[1.02]'
                                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                                            }`}
                                    >
                                        {otpLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                Verifying...
                                            </span>
                                        ) : (
                                            'Verify Code'
                                        )}
                                    </button>

                                    {/* Resend OTP */}
                                    <div className="text-center">
                                        {otpCountdown > 0 ? (
                                            <p className="text-white/50 text-sm">
                                                Resend code in {otpCountdown}s
                                            </p>
                                        ) : (
                                            <button
                                                onClick={sendOtp}
                                                disabled={otpLoading}
                                                className="text-primary-400 hover:text-primary-300 text-sm"
                                            >
                                                Resend verification code
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Verified Status */}
                            {otpVerified && (
                                <div className="bg-green-500/20 rounded-xl p-4 text-center border border-green-500/30">
                                    <p className="text-green-400 font-medium">
                                        ✓ Phone verified successfully!
                                    </p>
                                </div>
                            )}

                            {/* Error */}
                            {otpError && (
                                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300 text-center text-sm">
                                    {otpError}
                                </div>
                            )}
                        </div>

                        <NavButtons showNext={false} />
                    </div>
                );

            case 5: // Confirmation
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-white mb-2">
                                Confirm Your {cart.length > 1 ? 'Appointments' : 'Appointment'}
                            </h3>
                            <p className="text-white/60">Review and submit your booking{cart.length > 1 ? 's' : ''}</p>
                        </div>

                        <div className="max-w-lg mx-auto space-y-4">
                            {/* Customer Info */}
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <h4 className="text-white font-medium mb-2">Customer Details</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-white/60">Name:</span>
                                        <span className="text-white ml-2">{customer.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-white/60">Phone:</span>
                                        <span className="text-white ml-2">{customer.phone}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Appointments List */}
                            <div className="space-y-3">
                                {cart.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="bg-white/5 rounded-xl p-4 border border-white/10"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-xs text-primary-400">Appointment {index + 1}</span>
                                                <h4 className="font-semibold text-white">{item.serviceName}</h4>
                                                <p className="text-sm text-white/60">
                                                    {item.date} at {formatTime(item.time)} • {item.stylistName}
                                                </p>
                                                <p className="text-xs text-white/40 mt-1">{item.serviceDuration} mins</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-primary-400 font-bold">Rs {item.servicePrice}</span>
                                                {cart.length > 1 && (
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="block text-xs text-red-400 hover:text-red-300 mt-1"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="bg-primary-400/20 rounded-xl p-4 border border-primary-400/50">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-white font-semibold">Total ({cart.length} appointment{cart.length > 1 ? 's' : ''})</span>
                                        <span className="text-white/60 text-sm block">{totalDuration} mins</span>
                                    </div>
                                    <span className="text-primary-400 font-bold text-2xl">Rs {totalPrice}</span>
                                </div>
                            </div>

                            {/* Add Another Appointment */}
                            <div className="text-center">
                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="text-primary-400 hover:text-primary-300 text-sm font-medium"
                                >
                                    + Add Another Appointment
                                </button>
                            </div>

                            {customer.notes && (
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h4 className="text-white font-medium mb-2">Notes</h4>
                                    <p className="text-white/60 text-sm">{customer.notes}</p>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="max-w-lg mx-auto bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300 text-center">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4 mt-6 max-w-lg mx-auto">
                            <button
                                onClick={goBack}
                                className="flex items-center gap-2 px-6 py-3 rounded-full border-2 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || cart.length === 0}
                                className="flex items-center gap-2 px-8 py-3 rounded-full font-medium bg-gradient-to-r from-primary-400 to-primary-600 text-white shadow-[0_0_20px_rgba(116,150,116,0.4)] hover:scale-105 transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        Booking...
                                    </>
                                ) : (
                                    <>
                                        Confirm {cart.length} Booking{cart.length > 1 ? 's' : ''}
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            <section
                ref={sectionRef}
                id="appointment"
                className={`h-[100dvh] w-full bg-gradient-to-br from-primary-950 via-[#0a1a0a] to-primary-950 relative z-10 overflow-hidden ${isStandalone ? 'pt-20' : ''}`}
            >
                {/* Desktop Layout */}
                <div className={`h-full flex ${isMobile ? 'hidden' : ''}`}>
                    {/* Left Sidebar - Steps */}
                    <div className="w-80 bg-black/40 backdrop-blur-xl border-r border-primary-400/20 p-6 flex flex-col">
                        <h2 className="text-2xl font-bold gradient-text mb-8">Book Appointment</h2>

                        <div className="flex-1">
                            {steps.map((s) => (
                                <div
                                    key={s.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl mb-2 transition-all cursor-pointer ${currentStep === s.id
                                        ? 'bg-primary-400/20 border border-primary-400/50'
                                        : currentStep > s.id
                                            ? 'bg-white/5 border border-white/10'
                                            : 'opacity-50'
                                        }`}
                                    onClick={() => currentStep > s.id && setCurrentStep(s.id)}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${currentStep > s.id
                                        ? 'bg-primary-400 text-white'
                                        : currentStep === s.id
                                            ? 'bg-primary-400 text-white ring-2 ring-primary-400/50'
                                            : 'bg-white/10 text-white/40'
                                        }`}>
                                        {currentStep > s.id ? '✓' : s.icon}
                                    </div>
                                    <div>
                                        <p className={`font-medium ${currentStep >= s.id ? 'text-white' : 'text-white/40'}`}>
                                            {s.title}
                                        </p>
                                        <p className="text-xs text-white/50">{s.subtitle}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Cart Summary */}
                        {cart.length > 0 && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <p className="text-white/60 text-sm mb-1">Cart Summary</p>
                                <p className="text-white font-semibold">{cart.length} appointment(s)</p>
                                <p className="text-primary-400 font-bold">Rs {totalPrice}</p>
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-8 overflow-y-auto themed-scrollbar">
                        <div className="w-full max-w-4xl mx-auto pb-8">
                            {renderStepContent()}
                        </div>
                    </div>
                </div>

                {/* Mobile Layout */}
                <div className={`h-full flex flex-col ${isMobile ? '' : 'hidden'}`}>
                    {/* Mobile Header */}
                    <div className="flex-shrink-0 bg-black/60 backdrop-blur-lg border-b border-primary-400/20 px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-bold gradient-text">Book Appointment</h2>
                            <div className="flex items-center gap-2">
                                {cart.length > 0 && (
                                    <span className="bg-primary-400 text-white text-xs px-2 py-1 rounded-full">
                                        {cart.length} in cart
                                    </span>
                                )}
                                <span className="text-white/50 text-xs">Step {currentStep}/{steps.length}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {steps.map(s => (
                                <div
                                    key={s.id}
                                    className={`flex-1 h-1 rounded-full transition-all ${currentStep >= s.id ? 'bg-primary-400' : 'bg-white/20'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Mobile Content - No scrolling, use Next button to navigate */}
                    <div className="flex-1 overflow-hidden p-4 flex flex-col">
                        <div className="flex-1 overflow-y-auto themed-scrollbar">
                            {renderStepContent()}
                        </div>
                    </div>
                </div>
            </section>

            {/* Service Configuration Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-primary-950 to-[#0a1a0a] rounded-2xl p-6 max-w-md w-full border border-primary-400/30 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Configure Service</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-white/60 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                        {renderModalContent()}
                    </div>
                </div>
            )}

            {/* Booking Success Modal */}
            {bookingSuccess && bookingSuccess.show && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-primary-950 to-[#0a1a0a] rounded-2xl p-8 max-w-md w-full border border-primary-400/50 text-center">
                        {/* Success Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-400/20 flex items-center justify-center">
                            <svg className="w-10 h-10 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">🎉 Booking Confirmed!</h2>
                        <p className="text-white/60 mb-6">Your appointment has been successfully booked.</p>

                        {/* Appointment Details */}
                        <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-3">
                            {bookingSuccess.appointments.map((apt, i) => (
                                <div key={i} className="flex justify-between items-center border-b border-white/10 pb-2 last:border-0 last:pb-0">
                                    <div>
                                        <p className="text-white font-medium">{apt.serviceName}</p>
                                        <p className="text-white/60 text-sm">
                                            {new Date(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formatTime(apt.time)}
                                        </p>
                                    </div>
                                    <span className="text-primary-400 font-medium">Rs {apt.price}</span>
                                </div>
                            ))}
                        </div>

                        {/* Confirmation Message */}
                        <p className="text-white/50 text-sm mb-6">
                            📱 Confirmation SMS has been sent to your phone.
                        </p>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setBookingSuccess(null);
                                    setCurrentStep(1);
                                }}
                                className="w-full px-6 py-3 rounded-full font-medium bg-gradient-to-r from-primary-400 to-primary-600 text-white shadow-[0_0_20px_rgba(116,150,116,0.4)] hover:scale-105 transition-all"
                            >
                                + Book Another Appointment
                            </button>
                            <a
                                href="/"
                                className="block text-white/60 hover:text-white text-sm transition-colors"
                            >
                                Done — Go to Home
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
