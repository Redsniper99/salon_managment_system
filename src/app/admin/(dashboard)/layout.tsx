'use client';

import { useEffect, useState } from 'react';
import { WorkspaceProvider } from '@/lib/workspace';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileSidebar from '@/components/layout/MobileSidebar';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user } = useAuth();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Branch gate: non-owners must pick a branch before they can access the dashboard.
    // This ensures RLS-enforced branch policies behave correctly right after login.
    useEffect(() => {
        if (
            user &&
            (user.role === 'Manager' || user.role === 'Stylist' || user.role === 'Receptionist') &&
            !user.branchId
        ) {
            router.replace('/admin/select-branch');
        }
    }, [user, router]);

    return (
        <ProtectedRoute>
            <WorkspaceProvider>
            <div className="flex h-dvh overflow-hidden">
                {/* Desktop Sidebar */}
                <Sidebar />

                {/* Mobile Sidebar */}
                <MobileSidebar
                    isOpen={mobileMenuOpen}
                    onClose={() => setMobileMenuOpen(false)}
                />

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header onMenuClick={() => setMobileMenuOpen(true)} />

                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors">
                        <div className="container mx-auto px-4 lg:px-6 py-6 max-w-full">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
            </WorkspaceProvider>
        </ProtectedRoute>
    );
}
