'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Service, ServiceCategory } from '@/lib/types';
import { Check } from 'lucide-react';

interface MultiServiceSelectorProps {
    services: Service[];
    selectedServiceIds: string[];
    onSelectionChange: (serviceIds: string[]) => void;
}

export default function MultiServiceSelector({
    services,
    selectedServiceIds,
    onSelectionChange
}: MultiServiceSelectorProps) {
    // Group services by category
    const groupedServices = services.reduce((acc, service) => {
        if (!acc[service.category]) {
            acc[service.category] = [];
        }
        acc[service.category].push(service);
        return acc;
    }, {} as Record<ServiceCategory, Service[]>);

    const toggleService = (serviceId: string) => {
        if (selectedServiceIds.includes(serviceId)) {
            onSelectionChange(selectedServiceIds.filter(id => id !== serviceId));
        } else {
            onSelectionChange([...selectedServiceIds, serviceId]);
        }
    };

    // Calculate totals
    const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Services ({selectedServiceIds.length} selected)
                </label>
                {selectedServiceIds.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        Total: Rs {totalPrice.toLocaleString()} • {totalDuration} mins
                    </div>
                )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {Object.entries(groupedServices).map(([category, categoryServices]) => (
                    <div key={category}>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                            {category}
                        </h4>
                        <div className="space-y-2">
                            {categoryServices.map((service) => {
                                const isSelected = selectedServiceIds.includes(service.id);
                                return (
                                    <motion.button
                                        key={service.id}
                                        type="button"
                                        onClick={() => toggleService(service.id)}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${isSelected
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium text-sm ${isSelected
                                                            ? 'text-primary-700 dark:text-primary-300'
                                                            : 'text-gray-900 dark:text-white'
                                                        }`}>
                                                        {service.name}
                                                    </span>
                                                    {service.gender && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                            {service.gender}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                                        Rs {service.price.toLocaleString()}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-500">
                                                        {service.duration} mins
                                                    </span>
                                                </div>
                                                {service.description && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-1">
                                                        {service.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center ${isSelected
                                                    ? 'bg-primary-500 border-primary-500'
                                                    : 'border-gray-300 dark:border-gray-600'
                                                }`}>
                                                {isSelected && (
                                                    <Check className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {selectedServiceIds.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Please select at least one service to continue
                </p>
            )}
        </div>
    );
}
