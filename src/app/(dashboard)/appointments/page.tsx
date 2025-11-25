'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Filter, Plus, Search } from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import CreateAppointmentModal from '@/components/appointments/CreateAppointmentModal';
import { Appointment, AppointmentStatus } from '@/lib/types';
import { formatTime, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Mock data
const mockAppointments: Appointment[] = [
    {
        id: '1',
        customerId: 'c1',
        stylistId: 's1',
        branchId: 'b1',
        services: ['Hair Cut', 'Styling'],
        date: '2024-11-26',
        startTime: '10:00',
        duration: 60,
        status: 'Confirmed',
        createdAt: '2024-11-25',
        updatedAt: '2024-11-25',
    },
    {
        id: '2',
        customerId: 'c2',
        stylistId: 's2',
        branchId: 'b1',
        services: ['Bridal Makeup'],
        date: '2024-11-26',
        startTime: '14:00',
        duration: 120,
        status: 'InService',
        createdAt: '2024-11-25',
        updatedAt: '2024-11-26',
    },
];

const statusColors: Record<AppointmentStatus, string> = {
    Pending: 'bg-warning-100 text-warning-700 border-warning-200',
    Confirmed: 'bg-secondary-100 text-secondary-700 border-secondary-200',
    InService: 'bg-primary-100 text-primary-700 border-primary-200',
    Completed: 'bg-success-100 text-success-700 border-success-200',
    Cancelled: 'bg-danger-100 text-danger-700 border-danger-200',
    NoShow: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function AppointmentsPage() {
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('2024-11-26');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const statuses: (AppointmentStatus | 'All')[] = [
        'All',
        'Pending',
        'Confirmed',
        'InService',
        'Completed',
        'Cancelled',
        'NoShow',
    ];

    const filteredAppointments = mockAppointments.filter((apt) => {
        if (selectedStatus !== 'All' && apt.status !== selectedStatus) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Appointments</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage all salon appointments</p>
                </div>
                <Button
                    variant="primary"
                    leftIcon={<Plus className="h-5 w-5" />}
                    onClick={() => setShowCreateModal(true)}
                >
                    New Appointment
                </Button>
            </div>

            {/* Filters & Search */}
            <div className="card p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Date Picker */}
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="lg:w-48"
                        leftIcon={<Calendar className="h-5 w-5" />}
                    />

                    {/* Search */}
                    <div className="flex-1">
                        <Input
                            type="text"
                            placeholder="Search by customer name, phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="h-5 w-5" />}
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex gap-2">
                        <Button
                            variant={view === 'list' ? 'primary' : 'outline'}
                            size="md"
                            onClick={() => setView('list')}
                        >
                            List
                        </Button>
                        <Button
                            variant={view === 'calendar' ? 'primary' : 'outline'}
                            size="md"
                            onClick={() => setView('calendar')}
                        >
                            Calendar
                        </Button>
                    </div>
                </div>

                {/* Status Filters */}
                <div className="flex gap-2 mt-4 overflow-x-auto">
                    {statuses.map((status) => (
                        <button
                            key={status}
                            onClick={() => setSelectedStatus(status)}
                            className={cn(
                                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200',
                                selectedStatus === status
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Appointments List */}
            {view === 'list' && (
                <div className="space-y-3">
                    {filteredAppointments.map((appointment, index) => (
                        <motion.div
                            key={appointment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="card p-6 hover:shadow-soft-lg transition-shadow duration-200 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                            <Calendar className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">Customer Name</h3>
                                                <span
                                                    className={cn(
                                                        'px-2 py-0.5 text-xs font-medium rounded-lg border',
                                                        statusColors[appointment.status]
                                                    )}
                                                >
                                                    {appointment.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {formatTime(appointment.startTime)} • {appointment.duration} min • Stylist Name
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                                Services: {appointment.services.join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm">
                                        View
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                        Edit
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Calendar View Placeholder */}
            {view === 'calendar' && (
                <div className="card p-12 text-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <Calendar className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Calendar View</h3>
                    <p className="text-gray-500">
                        Interactive calendar view with drag-and-drop functionality coming soon
                    </p>
                </div>
            )}

            {/* Create Appointment Modal */}
            <CreateAppointmentModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />
        </div>
    );
}
