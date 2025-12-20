'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Filter, Plus, Search } from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import CreateAppointmentModal from '@/components/appointments/CreateAppointmentModal';
import AppointmentDetailsModal from '@/components/appointments/AppointmentDetailsModal';
import EditAppointmentModal from '@/components/appointments/EditAppointmentModal';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import CalendarView from '@/components/appointments/CalendarView';
import { AppointmentStatus } from '@/lib/types';
import { formatTime, formatDate, cn, getLocalDateString } from '@/lib/utils';
import { appointmentsService } from '@/services/appointments';

const statusColors: Record<AppointmentStatus, string> = {
    Pending: 'bg-warning-100 text-warning-700 border-warning-200 dark:bg-warning-900/30 dark:text-warning-400',
    Confirmed: 'bg-secondary-100 text-secondary-700 border-secondary-200 dark:bg-secondary-900/30 dark:text-secondary-400',
    InService: 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-400',
    Completed: 'bg-success-100 text-success-700 border-success-200 dark:bg-success-900/30 dark:text-success-400',
    Cancelled: 'bg-danger-100 text-danger-700 border-danger-200 dark:bg-danger-900/30 dark:text-danger-400',
    NoShow: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300',
};

export default function AppointmentsPage() {
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState<string | 'all'>(getLocalDateString());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const statuses: (AppointmentStatus | 'All')[] = [
        'All',
        'Pending',
        'Confirmed',
        'InService',
        'Completed',
        'Cancelled',
        'NoShow',
    ];

    // Fetch appointments
    useEffect(() => {
        fetchAppointments();
    }, [selectedDate, selectedStatus, view]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            setError(null);
            const filters: any = {};

            // For list view, filter by selected date (unless 'all' is selected)
            // For calendar view, fetch all appointments (calendar will handle display)
            if (view === 'list' && selectedDate !== 'all') {
                filters.date = selectedDate;
            }

            if (selectedStatus !== 'All') {
                filters.status = selectedStatus;
            }
            const data = await appointmentsService.getAppointments(filters);
            setAppointments(data || []);
        } catch (err: any) {
            console.error('Error fetching appointments:', err);
            setError(err.message || 'Failed to load appointments');
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAppointmentCreated = () => {
        setShowCreateModal(false);
        fetchAppointments(); // Refresh list
    };

    const handleViewAppointment = (apt: any) => {
        setSelectedAppointment(apt);
        setShowDetailsModal(true);
    };

    const handleEditAppointment = (apt: any) => {
        setSelectedAppointment(apt);
        setShowDetailsModal(false);
        setShowEditModal(true);
    };

    const handleDeleteClick = (apt?: any) => {
        if (apt) setSelectedAppointment(apt);
        setShowDetailsModal(false);
        setShowDeleteDialog(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedAppointment) return;

        setDeleteLoading(true);
        try {
            await appointmentsService.deleteAppointment(selectedAppointment.id);
            setShowDeleteDialog(false);
            setSelectedAppointment(null);
            fetchAppointments();
        } catch (error: any) {
            alert(error.message || 'Failed to delete appointment');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleStatusUpdate = async (status: AppointmentStatus) => {
        if (!selectedAppointment) return;

        try {
            await appointmentsService.updateStatus(selectedAppointment.id, status);
            // Update local state
            setSelectedAppointment({ ...selectedAppointment, status });
            fetchAppointments();
        } catch (error: any) {
            alert(error.message || 'Failed to update status');
            throw error;
        }
    };

    // Filter appointments by search query
    const filteredAppointments = appointments.filter(apt => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            apt.customer?.name?.toLowerCase().includes(query) ||
            apt.customer?.phone?.toLowerCase().includes(query) ||
            apt.stylist?.name?.toLowerCase().includes(query)
        );
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
                    <div className="w-full max-w-full lg:w-auto flex-shrink-0">
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={selectedDate === 'all' ? '' : selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value || 'all')}
                                className="w-full lg:w-48"
                                leftIcon={<Calendar className="h-5 w-5" />}
                                min={getLocalDateString()}
                            />
                            <Button
                                variant={selectedDate === 'all' ? 'primary' : 'outline'}
                                size="md"
                                onClick={() => setSelectedDate('all')}
                                className="whitespace-nowrap"
                            >
                                All Dates
                            </Button>
                        </div>
                    </div>

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
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">Loading appointments...</p>
                        </div>
                    ) : error ? (
                        <div className="card p-6 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
                            <p className="text-danger-700 dark:text-danger-400">{error}</p>
                        </div>
                    ) : filteredAppointments.length === 0 ? (
                        <div className="card p-12 text-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                            <Calendar className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Appointments</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                No appointments found for the selected date and status.
                            </p>
                        </div>
                    ) : (
                        filteredAppointments.map((appointment, index) => (
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
                                            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                                                <Calendar className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                                        {appointment.customer?.name || 'Unknown Customer'}
                                                    </h3>
                                                    <span
                                                        className={cn(
                                                            'px-2 py-0.5 text-xs font-medium rounded-lg border',
                                                            statusColors[appointment.status as AppointmentStatus]
                                                        )}
                                                    >
                                                        {appointment.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {formatTime(appointment.start_time)} • {appointment.duration} min • {appointment.stylist?.name || 'Stylist'}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                                    Services: {Array.isArray(appointment.services) ? appointment.services.length : 0} selected
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewAppointment(appointment)}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditAppointment(appointment)}
                                        >
                                            Edit
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            )}

            {/* Calendar View */}
            {view === 'calendar' && (
                <CalendarView
                    appointments={appointments}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    onAppointmentClick={handleViewAppointment}
                />
            )}

            {/* Create Appointment Modal */}
            <CreateAppointmentModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleAppointmentCreated}
            />

            {/* Appointment Details Modal */}
            <AppointmentDetailsModal
                isOpen={showDetailsModal}
                onClose={() => {
                    setShowDetailsModal(false);
                    setSelectedAppointment(null);
                }}
                appointment={selectedAppointment}
                onEdit={() => handleEditAppointment(selectedAppointment)}
                onDelete={() => handleDeleteClick()}
                onStatusUpdate={handleStatusUpdate}
            />

            {/* Edit Appointment Modal */}
            <EditAppointmentModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedAppointment(null);
                }}
                appointment={selectedAppointment}
                onSuccess={() => {
                    setShowEditModal(false);
                    setSelectedAppointment(null);
                    fetchAppointments();
                }}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Appointment?"
                message={`Are you sure you want to delete the appointment for ${selectedAppointment?.customer?.name || 'this customer'}? This action cannot be undone.`}
                confirmText="Yes, Delete"
                cancelText="Cancel"
                variant="danger"
                loading={deleteLoading}
            />
        </div>
    );
}
