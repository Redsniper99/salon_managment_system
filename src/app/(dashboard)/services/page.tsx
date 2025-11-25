'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import { Service } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Mock data
const mockServices: Service[] = [
    {
        id: '1',
        name: 'Hair Cut',
        category: 'Hair',
        price: 500,
        duration: 30,
        gender: 'Unisex',
        isActive: true,
    },
    {
        id: '2',
        name: 'Bridal Makeup',
        category: 'Bridal',
        price: 6000,
        duration: 120,
        gender: 'Female',
        isActive: true,
    },
    {
        id: '3',
        name: 'Beard Styling',
        category: 'Beard',
        price: 300,
        duration: 20,
        gender: 'Male',
        isActive: true,
    },
];

export default function ServicesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const categories = ['All', 'Hair', 'Beard', 'Facial', 'Bridal', 'Kids', 'Spa', 'Other'];

    const filteredServices = mockServices.filter((service) => {
        if (selectedCategory !== 'All' && service.category !== selectedCategory) return false;
        if (searchQuery && !service.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Services</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage salon services and pricing</p>
                </div>
                <Button variant="primary" leftIcon={<Plus className="h-5 w-5" />}>
                    Add Service
                </Button>
            </div>

            {/* Filters */}
            <div className="card p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            type="text"
                            placeholder="Search services..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="h-5 w-5" />}
                        />
                    </div>
                </div>

                {/* Category Filters */}
                <div className="flex gap-2 mt-4 overflow-x-auto">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={cn(
                                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200',
                                selectedCategory === category
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            )}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service, index) => (
                    <motion.div
                        key={service.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="card p-6 card-hover bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{service.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-medium rounded-lg">
                                        {service.category}
                                    </span>
                                    {service.gender && (
                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg">
                                            {service.gender}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className={cn(
                                'w-2 h-2 rounded-full',
                                service.isActive ? 'bg-success-500' : 'bg-gray-400'
                            )}></div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Price</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(service.price)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
                                <span className="text-sm text-gray-900 dark:text-white">{service.duration} min</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" leftIcon={<Edit className="h-4 w-4" />}>
                                Edit
                            </Button>
                            <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4 text-danger-600" />}>
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
