'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StatCard from '@/components/shared/StatCard';
import { reportsService } from '@/services/reports';
import { availabilityService } from '@/services/availability';
import { staffService } from '@/services/staff';
import { useAuth } from '@/lib/auth';
import {
    DollarSign,
    Calendar,
    CheckCircle2,
    XCircle,
    Scissors,
    Users,
} from 'lucide-react';

interface DashboardStats {
    todayRevenue: number;
    todayAppointments: number;
    completed: number;
    cancelled: number;
    noShow: number;
    topServices: { name: string; count: number; revenue: number }[];
    topStylists: { name: string; revenue: number; appointments: number }[];
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        todayRevenue: 0,
        todayAppointments: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        topServices: [],
        topStylists: [],
    });
    const [loading, setLoading] = useState(true);
    const [isEmergencyUnavailable, setIsEmergencyUnavailable] = useState(false);
    const [togglingEmergency, setTogglingEmergency] = useState(false);
    const [staffId, setStaffId] = useState<string | null>(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (user?.role === 'Stylist') {
            fetchStaffIdAndStatus();
        }
    }, [user]);

    const fetchStaffIdAndStatus = async () => {
        if (!user?.email) return;
        try {
            // Fetch staff record by email (assuming email is unique and shared)
            // Or better, by profile_id if available in staff table
            const staff = await staffService.getStaffByEmail(user.email);
            if (staff) {
                setStaffId(staff.id);
                // Check status
                const status = await availabilityService.getEmergencyStatus(staff.id);
                setIsEmergencyUnavailable(status);
            }
        } catch (error) {
            console.error('Error fetching staff info:', error);
        }
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];

            // Fetch basic stats
            const basicStats = await reportsService.getDashboardStats();

            // Fetch top services and stylists for today
            const topServices = await reportsService.getTopServices(today + 'T00:00:00', today + 'T23:59:59');
            const topStylists = await reportsService.getStaffPerformance(today, today);

            setStats({
                todayRevenue: basicStats.todayRevenue,
                todayAppointments: basicStats.todayAppointments,
                completed: basicStats.completedAppointments,
                cancelled: basicStats.cancelledAppointments,
                noShow: basicStats.noShowAppointments,
                topServices: topServices.map(s => ({
                    name: s.serviceName,
                    count: s.count,
                    revenue: s.revenue
                })),
                topStylists: topStylists.map(s => ({
                    name: s.stylistName,
                    revenue: s.revenue,
                    appointments: s.appointmentCount
                }))
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEmergencyToggle = async () => {
        if (!staffId) {
            alert("Could not find your staff profile. Please contact admin.");
            return;
        }

        setTogglingEmergency(true);
        try {
            const newStatus = !isEmergencyUnavailable;
            await availabilityService.toggleEmergencyStatus(staffId, newStatus);
            setIsEmergencyUnavailable(newStatus);
        } catch (error) {
            console.error('Error toggling emergency status:', error);
            alert('Failed to update status. Please try again.');
        } finally {
            setTogglingEmergency(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
                </div>

                {/* Emergency Toggle for Stylists */}
                {user?.role === 'Stylist' && (
                    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-800">
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-red-800 dark:text-red-300">Emergency Mode</span>
                            <span className="text-xs text-red-600 dark:text-red-400">Stop new bookings</span>
                        </div>
                        <button
                            onClick={handleEmergencyToggle}
                            disabled={togglingEmergency}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${isEmergencyUnavailable ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                        >
                            <span
                                className={`${isEmergencyUnavailable ? 'translate-x-6' : 'translate-x-1'
                                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                            />
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Today's Revenue"
                    value={`Rs ${stats.todayRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    trend={{ value: 12.5, isPositive: true }}
                />
                <StatCard
                    title="Today's Appointments"
                    value={stats.todayAppointments}
                    icon={Calendar}
                    trend={{ value: 8.2, isPositive: true }}
                />
                <StatCard
                    title="Completed"
                    value={stats.completed}
                    icon={CheckCircle2}
                />
                <StatCard
                    title="Cancelled/No-Show"
                    value={stats.cancelled + stats.noShow}
                    icon={XCircle}
                />
            </div>

            {/* Charts & Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Services */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-secondary-100 dark:bg-secondary-900/30 rounded-xl">
                            <Scissors className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Services</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">By revenue today</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {stats.topServices.map((service, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{service.name}</span>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                            Rs {service.revenue.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-secondary-500 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${(service.revenue / (stats.topServices[0]?.revenue || 1)) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">{service.count} bookings</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Top Stylists */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                            <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Stylists</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">By revenue today</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {stats.topStylists.map((stylist, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                                    <span className="text-primary-700 dark:text-primary-400 font-semibold">{index + 1}</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{stylist.name}</span>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                            Rs {stylist.revenue.toLocaleString()}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-500">{stylist.appointments} appointments</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Recent Activity or Quick Actions could go here */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
            >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <a
                        href="/appointments"
                        className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 group"
                    >
                        <Calendar className="h-8 w-8 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 mb-2" />
                        <h3 className="font-medium text-gray-900 dark:text-white">New Appointment</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Book a customer</p>
                    </a>
                    <a
                        href="/pos"
                        className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 group"
                    >
                        <DollarSign className="h-8 w-8 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 mb-2" />
                        <h3 className="font-medium text-gray-900 dark:text-white">Process Payment</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate invoice</p>
                    </a>
                    <a
                        href="/customers"
                        className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 group"
                    >
                        <Users className="h-8 w-8 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 mb-2" />
                        <h3 className="font-medium text-gray-900 dark:text-white">Add Customer</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">New customer record</p>
                    </a>
                    <a
                        href="/reports"
                        className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 group"
                    >
                        <Scissors className="h-8 w-8 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 mb-2" />
                        <h3 className="font-medium text-gray-900 dark:text-white">View Reports</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Analytics & insights</p>
                    </a>
                </div>
            </motion.div>
        </div>
    );
}
