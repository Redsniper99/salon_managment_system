'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useRouter } from 'next/navigation';
import { Menu, X, Bell, LogOut, User, Sun, Moon } from 'lucide-react';
import Button from '@/components/shared/Button';
import { supabase } from '@/lib/supabase';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationsPreview, setNotificationsPreview] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    const toTimeAgo = (createdAt: string | Date) => {
        const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (!Number.isFinite(diffMins) || diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
        return `${Math.floor(diffMins / 1440)} day ago`;
    };

    const fetchPreview = async (limit = 5) => {
        if (!user) return;
        try {
            setLoadingNotifications(true);
            const sessionRes = await supabase.auth.getSession();
            const accessToken = sessionRes?.data?.session?.access_token;
            if (!accessToken) return;

            const res = await fetch(`/api/in-app-notifications?limit=${limit}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            const json = await res.json();
            if (!json?.success) return;
            setUnreadCount(json.unreadCount || 0);
            setNotificationsPreview(json.notifications || []);
        } catch (e) {
            console.error('Failed to fetch in-app notifications preview:', e);
        } finally {
            setLoadingNotifications(false);
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        try {
            const sessionRes = await supabase.auth.getSession();
            const accessToken = sessionRes?.data?.session?.access_token;
            if (!accessToken) return;

            await fetch(`/api/in-app-notifications/mark-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({ markAll: true })
            });
        } catch (e) {
            console.error('Failed to mark notifications as read:', e);
        }
    };

    useEffect(() => {
        if (!user) return;
        // Load unread count on header mount.
        fetchPreview(5);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4 sticky top-0 z-40 transition-colors">
            <div className="flex items-center justify-between">
                {/* Mobile Menu Button & Logo */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    >
                        <Menu className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                    </button>
                    <div className="lg:hidden">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">SalonFlow</h1>
                    </div>
                </div>

                {/* Right Side - Theme Toggle, Notifications & User */}
                <div className="flex items-center gap-3">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                        aria-label="Toggle theme"
                    >
                        {theme === 'light' ? (
                            <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        ) : (
                            <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        )}
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={async () => {
                                const next = !showNotifications;
                                setShowNotifications(next);
                                if (next) {
                                    // On open: refresh and mark as read.
                                    await fetchPreview(5);
                                    await markAllAsRead();
                                    await fetchPreview(5);
                                }
                            }}
                            className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                        >
                            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowNotifications(false)}
                                />
                                <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white dark:bg-gray-800 rounded-xl shadow-soft-lg border border-gray-200 dark:border-gray-700 z-20 max-h-[70vh] overflow-y-auto">
                                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                                    </div>
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {loadingNotifications ? (
                                            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                                Loading...
                                            </div>
                                        ) : notificationsPreview.length === 0 ? (
                                            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                                No notifications yet.
                                            </div>
                                        ) : (
                                            notificationsPreview.map((n) => (
                                                <div
                                                    key={n.id}
                                                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                                >
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        {n.createdAt ? toTimeAgo(n.createdAt) : ''}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
                                        <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                                            View all notifications
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* User Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                        >
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
                            </div>
                            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center">
                                <User className="h-5 w-5 text-primary-600 dark:text-primary-300" />
                            </div>
                        </button>

                        {/* Dropdown */}
                        {showUserMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowUserMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-[min(14rem,calc(100vw-2rem))] bg-white dark:bg-gray-800 rounded-xl shadow-soft-lg border border-gray-200 dark:border-gray-700 py-2 z-20">
                                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign Out
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
