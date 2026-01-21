'use client';

import { useState } from 'react';
import { ShoppingCart, User } from 'lucide-react';
import Button from '@/components/shared/Button';

interface WalkInServicesPanelProps {
    services: any[];
    staff: any[];
    selectedStylistForService: Map<string, string>;
    onStylistChange: (serviceId: string, stylistId: string) => void;
    onAddService: (service: any, stylistId: string) => void;
}

export default function WalkInServicesPanel({
    services,
    staff,
    selectedStylistForService,
    onStylistChange,
    onAddService
}: WalkInServicesPanelProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredServices = services.filter(s =>
        s.is_active && (
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const groupedServices: { [key: string]: any[] } = {};
    filteredServices.forEach(service => {
        if (!groupedServices[service.category]) {
            groupedServices[service.category] = [];
        }
        groupedServices[service.category].push(service);
    });

    return (
        <div className="card p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Walk-in Services
            </h2>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Select services and assign stylists for walk-in customers
            </p>

            <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 mb-4 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
            />

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {Object.entries(groupedServices).map(([category, categoryServices]) => (
                    <div key={category}>
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            {category}
                        </h3>
                        <div className="space-y-2">
                            {categoryServices.map((service: any) => {
                                const selectedStylist = selectedStylistForService.get(service.id);

                                return (
                                    <div
                                        key={service.id}
                                        className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                                    {service.name}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Rs. {service.price.toLocaleString()} • {service.duration} min
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <select
                                                value={selectedStylist || ''}
                                                onChange={(e) => onStylistChange(service.id, e.target.value)}
                                                className="flex-1 px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                                            >
                                                <option value="">Select Stylist...</option>
                                                {staff.map((stylist: any) => (
                                                    <option key={stylist.id} value={stylist.id}>
                                                        {stylist.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <Button
                                                size="sm"
                                                onClick={() => onAddService(service, selectedStylist || '')}
                                                disabled={!selectedStylist}
                                                className="whitespace-nowrap"
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {filteredServices.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No services found</p>
                </div>
            )}
        </div>
    );
}
