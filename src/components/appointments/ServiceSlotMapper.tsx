'use client';

import { useState, useEffect } from 'react';
import { Service } from '@/lib/types';
import { staffService } from '@/services/staff';
import TimeSlotPicker from '@/components/scheduling/TimeSlotPicker';
import AvailableStylistsView from './AvailableStylistsView';
import { Scissors, Clock, DollarSign } from 'lucide-react';

interface ServiceSlotMapperProps {
    service: Service;
    date: string;
    hasStylistPreference: boolean;
    onSelect: (stylistId: string, time: string, stylistName: string) => void;
    selectedStylist?: string;
    selectedTime?: string;
    branchId?: string;
    previousBookingTime?: string; // For showing the last selected time when same stylist
}

export default function ServiceSlotMapper({
    service,
    date,
    hasStylistPreference,
    onSelect,
    selectedStylist,
    selectedTime,
    branchId,
    previousBookingTime
}: ServiceSlotMapperProps) {
    const [stylists, setStylists] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch stylists qualified for this service
    useEffect(() => {
        if (hasStylistPreference && date) {
            fetchStylists();
        }
    }, [service.id, date, hasStylistPreference]);

    const fetchStylists = async () => {
        setLoading(true);
        try {
            const data = await staffService.getStylistsByService(service.id, branchId, date);
            setStylists(data || []);
        } catch (error) {
            console.error('Error fetching stylists:', error);
            setStylists([]);
        } finally {
            setLoading(false);
        }
    };

    const handleStylistChange = (stylistId: string) => {
        const stylist = stylists.find(s => s.id === stylistId);
        onSelect(stylistId, '', stylist?.name || '');
    };

    const handleTimeSelect = (time: string) => {
        if (selectedStylist) {
            const stylist = stylists.find(s => s.id === selectedStylist);
            onSelect(selectedStylist, time, stylist?.name || '');
        }
    };

    return (
        <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50">
            {/* Service Header */}
            <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {service.name}
                        </h3>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>Rs {service.price.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{service.duration} mins</span>
                        </div>
                        {service.gender && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700">
                                {service.gender}
                            </span>
                        )}
                    </div>
                </div>
                {selectedStylist && selectedTime && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        ✓ Booked
                    </div>
                )}
            </div>

            {/* Stylist & Time Selection */}
            {hasStylistPreference ? (
                <div className="space-y-3">
                    {/* Stylist Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Select Stylist
                        </label>
                        <select
                            value={selectedStylist || ''}
                            onChange={(e) => handleStylistChange(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900 dark:text-white text-sm"
                            disabled={loading}
                        >
                            <option value="">Choose a stylist...</option>
                            {stylists.map((stylist) => (
                                <option key={stylist.id} value={stylist.id}>
                                    {stylist.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Time Slots for Selected Stylist */}
                    {selectedStylist && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Available Time Slots
                            </label>
                            <TimeSlotPicker
                                stylistId={selectedStylist}
                                date={date}
                                serviceDuration={service.duration}
                                onSelect={handleTimeSelect}
                                selectedTime={selectedTime}
                                previousBookingTime={previousBookingTime}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Available Stylists & Time Slots
                    </label>
                    <AvailableStylistsView
                        serviceId={service.id}
                        serviceName={service.name}
                        serviceDuration={service.duration}
                        date={date}
                        onSelect={(stylistId, time, stylistName) => {
                            onSelect(stylistId, time, stylistName);
                        }}
                        branchId={branchId}
                    />
                </div>
            )}
        </div>
    );
}
