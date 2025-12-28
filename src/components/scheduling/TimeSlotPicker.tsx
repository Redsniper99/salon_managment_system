'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Loader, AlertCircle } from 'lucide-react';
import { schedulingService } from '@/services/scheduling';

interface TimeSlot {
    time: string;
    available: boolean;
    reason?: string;
}

interface TimeSlotPickerProps {
    stylistId: string;
    date: string;
    serviceDuration: number; // in minutes
    onSelect: (time: string) => void;
    selectedTime?: string;
    previousBookingTime?: string; // Previously selected time for sequential booking hint
}

export default function TimeSlotPicker({
    stylistId,
    date,
    serviceDuration,
    onSelect,
    selectedTime,
    previousBookingTime
}: TimeSlotPickerProps) {
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (stylistId && date && serviceDuration) {
            fetchTimeSlots();
        }
    }, [stylistId, date, serviceDuration]);

    const fetchTimeSlots = async () => {
        setLoading(true);
        const timeSlots = await schedulingService.getAvailableTimeSlots(
            stylistId,
            date,
            serviceDuration
        );
        setSlots(timeSlots);
        setLoading(false);
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    const getSlotColor = (slot: TimeSlot) => {
        if (!slot.available) {
            if (slot.reason === 'Break time') {
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 cursor-not-allowed';
            }
            return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 cursor-not-allowed';
        }
        if (selectedTime === slot.time) {
            return 'bg-primary-600 text-white ring-2 ring-primary-400';
        }
        // Highlight previous booking time with blue border
        if (previousBookingTime === slot.time) {
            return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 cursor-pointer ring-2 ring-blue-400 dark:ring-blue-500';
        }
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 cursor-pointer';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader className="h-6 w-6 animate-spin text-primary-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading available times...</span>
            </div>
        );
    }

    if (slots.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    No Available Times
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Please select a different date or stylist
                </p>
            </div>
        );
    }

    const availableCount = slots.filter(s => s.available).length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Select Time
                    </h3>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                    {availableCount} slot{availableCount !== 1 ? 's' : ''} available
                </span>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded border border-green-300 dark:border-green-700" />
                    <span className="text-gray-700 dark:text-gray-300">Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 rounded border border-red-300 dark:border-red-700" />
                    <span className="text-gray-700 dark:text-gray-300">Booked</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-300 dark:border-yellow-700" />
                    <span className="text-gray-700 dark:text-gray-300">Break</span>
                </div>
            </div>

            {/* Time Slots Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {slots.map((slot) => (
                    <motion.button
                        key={slot.time}
                        whileHover={slot.available ? { scale: 1.05 } : {}}
                        whileTap={slot.available ? { scale: 0.95 } : {}}
                        onClick={() => slot.available && onSelect(slot.time)}
                        disabled={!slot.available}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${getSlotColor(slot)}`}
                        title={slot.reason || 'Available'}
                    >
                        {formatTime(slot.time)}
                    </motion.button>
                ))}
            </div>

            {/* Selected Info */}
            {selectedTime && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl"
                >
                    <p className="text-sm text-primary-700 dark:text-primary-300">
                        <strong>Selected:</strong> {formatTime(selectedTime)}
                        {serviceDuration && ` (${serviceDuration} min service)`}
                    </p>
                </motion.div>
            )}
        </div>
    );
}
