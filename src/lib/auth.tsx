'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from './types';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
    hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const MOCK_USERS: (User & { password: string })[] = [
    {
        id: '1',
        email: 'owner@salonflow.com',
        password: 'owner123',
        name: 'John Owner',
        role: 'Owner',
        isActive: true,
    },
    {
        id: '2',
        email: 'manager@salonflow.com',
        password: 'manager123',
        name: 'Sarah Manager',
        role: 'Manager',
        branchId: 'branch-1',
        isActive: true,
    },
    {
        id: '3',
        email: 'receptionist@salonflow.com',
        password: 'receptionist123',
        name: 'Emily Receptionist',
        role: 'Receptionist',
        branchId: 'branch-1',
        isActive: true,
    },
    {
        id: '4',
        email: 'stylist@salonflow.com',
        password: 'stylist123',
        name: 'Mike Stylist',
        role: 'Stylist',
        branchId: 'branch-1',
        isActive: true,
    },
];

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Check for stored user on mount
        const storedUser = localStorage.getItem('salonflow_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                localStorage.removeItem('salonflow_user');
            }
        }
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        const foundUser = MOCK_USERS.find(
            u => u.email === email && u.password === password
        );

        if (foundUser && foundUser.isActive) {
            const { password: _, ...userWithoutPassword } = foundUser;
            setUser(userWithoutPassword);
            localStorage.setItem('salonflow_user', JSON.stringify(userWithoutPassword));
            return true;
        }

        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('salonflow_user');
    };

    const hasRole = (roles: UserRole[]): boolean => {
        if (!user) return false;
        return roles.includes(user.role);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                logout,
                isAuthenticated: !!user,
                hasRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
