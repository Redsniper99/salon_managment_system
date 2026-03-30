'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface WebsiteAuthSession {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: {
        id: string;
        phone: string;
    };
}

interface WebsiteAuthContextType {
    session: WebsiteAuthSession | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setSession: (session: WebsiteAuthSession | null) => void;
    logout: () => Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAuthenticatedClient: () => any;
}

const WebsiteAuthContext = createContext<WebsiteAuthContextType | undefined>(undefined);

export function WebsiteAuthProvider({ children }: { children: ReactNode }) {
    const [session, setSessionState] = useState<WebsiteAuthSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('salonflow_session');
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as WebsiteAuthSession;
                if (parsed.expires_at * 1000 > Date.now()) {
                    setSessionState(parsed);
                } else {
                    localStorage.removeItem('salonflow_session');
                }
            } catch {
                localStorage.removeItem('salonflow_session');
            }
        }
        setIsLoading(false);
    }, []);

    const setSession = (newSession: WebsiteAuthSession | null) => {
        setSessionState(newSession);
        if (newSession) {
            localStorage.setItem('salonflow_session', JSON.stringify(newSession));
        } else {
            localStorage.removeItem('salonflow_session');
        }
    };

    const getAuthenticatedClient = () => {
        if (!session) {
            return supabase;
        }

        return createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            },
        });
    };

    const logout = async () => {
        setSession(null);
        await supabase.auth.signOut();
    };

    return (
        <WebsiteAuthContext.Provider
            value={{
                session,
                isAuthenticated: !!session,
                isLoading,
                setSession,
                logout,
                getAuthenticatedClient,
            }}
        >
            {children}
        </WebsiteAuthContext.Provider>
    );
}

export function useWebsiteAuth() {
    const context = useContext(WebsiteAuthContext);
    if (context === undefined) {
        throw new Error('useWebsiteAuth must be used within a WebsiteAuthProvider');
    }
    return context;
}

export { supabase as websiteSupabase };
