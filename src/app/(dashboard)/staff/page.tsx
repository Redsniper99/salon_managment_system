'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, UserCheck, UserX } from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import { Staff } from '@/lib/types';

// Mock data
const mockStaff: Staff[] = [
    {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah@salonflow.com',
        phone: '+94 77 123 4567',
        role: 'Stylist',
        branchId: 'b1',
        specializations: ['Hair Styling', 'Coloring', 'Bridal'],
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        workingHours: { start: '09:00', end: '18:00' },
        isActive: true,
        createdAt: '2024-01-01',
    },
    {
        id: '2',
        name: 'Mike Smith',
        email: 'mike@salonflow.com',
        phone: '+94 77 234 5678',
        role: 'Stylist',
        branchId: 'b1',
        specializations: ['Beard Styling', 'Hair Cut'],
        workingDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
        workingHours: { start: '10:00', end: '19:00' },
        isActive: true,
        createdAt: '2024-01-15',
    },
];

export default function StaffPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');

    const roles = ['All', 'Owner', 'Manager', 'Receptionist', 'Stylist'];

    const filteredStaff = mockStaff.filter((staff) => {
        if (roleFilter !== 'All' && staff.role !== roleFilter) return false;
        if (searchQuery && !staff.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage salon team members</p>
                </div>
                <Button variant="primary" leftIcon={<Plus className="h-5 w-5" />}>
                    Add Staff Member
                </Button>
            </div>

            {/* Filters */}
            <div className="card p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            type="text"
                            placeholder="Search staff..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="h-5 w-5" />}
                        />
                    </div>
                </div>

                {/* Role Filters */}
                <div className="flex gap-2 mt-4 overflow-x-auto">
                    {roles.map((role) => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${roleFilter === role
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            </div>

            {/* Staff List */}
            <div className="space-y-4">
                {filteredStaff.map((staff, index) => (
                    <motion.div
                        key={staff.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                    >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="flex-shrink-0 w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
                                    <span className="text-xl font-bold text-primary-600">
                                        {staff.name.split(' ').map(n => n[0]).join('')}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{staff.name}</h3>
                                        <span className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-400 text-xs font-medium rounded-lg">
                                            {staff.role}
                                        </span>
                                        {staff.isActive ? (
                                            <UserCheck className="h-4 w-4 text-success-600" />
                                        ) : (
                                            <UserX className="h-4 w-4 text-danger-600" />
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        {staff.email} • {staff.phone}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {staff.specializations.map((spec, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg"
                                            >
                                                {spec}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                        {staff.workingDays.join(', ')} • {staff.workingHours.start} - {staff.workingHours.end}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" leftIcon={<Edit className="h-4 w-4" />}>
                                    Edit
                                </Button>
                                <Button variant="ghost" size="sm">
                                    {staff.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
