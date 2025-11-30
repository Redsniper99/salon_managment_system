'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from './types';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    hasRole: (roles: UserRole[]) => boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                fetchUserProfile(session);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                fetchUserProfile(session);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (session: Session) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;

            if (data) {
                setUser({
                    id: data.id,
                    email: data.email,
                    name: data.name,
                    role: data.role as UserRole,
                    branchId: data.branch_id || undefined,
                    isActive: data.is_active,
                });
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                // Map Supabase errors to user-friendly messages
                if (error.message.includes('Invalid login credentials')) {
                    return { success: false, error: 'Incorrect email or password' };
                } else if (error.message.includes('Email not confirmed')) {
                    return { success: false, error: 'Please verify your email address' };
                } else if (error.message.includes('User not found')) {
                    return { success: false, error: 'No account found with this email' };
                } else {
                    return { success: false, error: error.message };
                }
            }

            if (data.session) {
                await fetchUserProfile(data.session);
                return { success: true };
            }

            return { success: false, error: 'Login failed. Please try again.' };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
            };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
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
                loading,
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
