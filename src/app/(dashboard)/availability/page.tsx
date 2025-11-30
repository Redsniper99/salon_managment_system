'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, X, Check, Loader, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '@/components/shared/Button';
import { availabilityService } from '@/services/availability';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function AvailabilityPage() {
    const { user, hasRole } = useAuth();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [stylistId, setStylistId] = useState<string | null>(null);
    const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const isStylist = hasRole(['Stylist']);

    useEffect(() => {
        if (isStylist) {
            fetchStylistId();
        }
    }, [isStylist]);

    useEffect(() => {
        if (stylistId) {
            fetchUnavailableDates();
        }
    }, [stylistId]);

    const fetchStylistId = async () => {
        try {
            const { data } = await supabase
                .from('staff')
                .select('id')
                .eq('profile_id', user?.id)
                .single();
            setStylistId(data?.id || null);
        } catch (error) {
            console.error('Error fetching stylist ID:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnavailableDates = async () => {
        if (!stylistId) return;
        const dates = await availabilityService.getUnavailableDates(stylistId);
        const dateStrings = new Set(dates.map(d => d.toISOString().split('T')[0]));
        setUnavailableDates(dateStrings);
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleDateClick = (dateStr: string) => {
        const newSelected = new Set(selectedDates);
        if (newSelected.has(dateStr)) {
            newSelected.delete(dateStr);
        } else {
            newSelected.add(dateStr);
        }
        setSelectedDates(newSelected);
    };

    const handleMarkUnavailable = () => {
        if (selectedDates.size === 0) {
            showMessage('error', 'Please select at least one date');
            return;
        }
        setShowReasonModal(true);
    };

    const confirmMarkUnavailable = async () => {
        if (!stylistId) return;

        setActionLoading(true);
        const result = await availabilityService.markUnavailable(
            stylistId,
            Array.from(selectedDates),
            reason
        );
        setActionLoading(false);

        if (result.success) {
            showMessage('success', result.message);
            setSelectedDates(new Set());
            setReason('');
            setShowReasonModal(false);
            fetchUnavailableDates();
        } else {
            showMessage('error', result.message);
        }
    };

    const handleMarkAvailable = async () => {
        if (!stylistId) return;
        if (selectedDates.size === 0) {
            showMessage('error', 'Please select at least one date');
            return;
        }

        setActionLoading(true);
        const result = await availabilityService.markAvailable(
            stylistId,
            Array.from(selectedDates)
        );
        setActionLoading(false);

        if (result.success) {
            showMessage('success', result.message);
            setSelectedDates(new Set());
            fetchUnavailableDates();
        } else {
            showMessage('error', result.message);
        }
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const renderCalendar = () => {
        const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
        const days = [];
        const today = new Date().toISOString().split('T')[0];

        // Empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} className="aspect-square" />);
        }

        // Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === today;
            const isPast = dateStr < today;
            const isUnavailable = unavailableDates.has(dateStr);
            const isSelected = selectedDates.has(dateStr);

            days.push(
                <button
                    key={dateStr}
                    onClick={() => !isPast && handleDateClick(dateStr)}
                    disabled={isPast}
                    className={`aspect-square p-2 rounded-lg text-sm font-medium transition-all ${isPast
                            ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            : isSelected
                                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                : isUnavailable
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                        } ${isToday ? 'ring-2 ring-primary-500' : ''}`}
                >
                    <div className="flex flex-col items-center justify-center">
                        <span>{day}</span>
                        {isToday && <span className="text-xs">Today</span>}
                    </div>
                </button>
            );
        }

        return days;
    };

    if (!isStylist) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Stylist Access Only
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        This page is only available to stylists
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Availability</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Mark dates when you're unavailable for appointments
                </p>
            </div>

            {/* Message */}
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl ${message.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                        }`}
                >
                    {message.text}
                </motion.div>
            )}

            {/* Legend */}
            <div className="card p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded border border-green-300 dark:border-green-700" />
                        <span className="text-gray-700 dark:text-gray-300">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded border border-red-300 dark:border-red-700" />
                        <span className="text-gray-700 dark:text-gray-300">Unavailable</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 rounded" />
                        <span className="text-gray-700 dark:text-gray-300">Selected</span>
                    </div>
                </div>
            </div>

            {/* Calendar */}
            <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                    {renderCalendar()}
                </div>
            </div>

            {/* Actions */}
            {selectedDates.size > 0 && (
                <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {selectedDates.size} date(s) selected
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Choose an action below
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="danger"
                            onClick={handleMarkUnavailable}
                            disabled={actionLoading}
                            leftIcon={<X className="h-5 w-5" />}
                        >
                            Mark Unavailable
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleMarkAvailable}
                            disabled={actionLoading}
                            leftIcon={<Check className="h-5 w-5" />}
                        >
                            Mark Available
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setSelectedDates(new Set())}
                        >
                            Clear Selection
                        </Button>
                    </div>
                </div>
            )}

            {/* Reason Modal */}
            {showReasonModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
                    >
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Add Reason (Optional)
                        </h2>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Vacation, Sick leave, Personal..."
                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900 dark:text-white resize-none"
                            rows={3}
                        />
                        <div className="flex gap-3 mt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowReasonModal(false);
                                    setReason('');
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={confirmMarkUnavailable}
                                disabled={actionLoading}
                                leftIcon={actionLoading ? <Loader className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                                className="flex-1"
                            >
                                {actionLoading ? 'Saving...' : 'Confirm'}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
