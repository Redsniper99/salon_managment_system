'use client';

import { WebsiteAuthProvider } from '@/context/WebsiteAuthContext';
import type { ReactNode } from 'react';

export default function WebsiteProviders({ children }: { children: ReactNode }) {
    return <WebsiteAuthProvider>{children}</WebsiteAuthProvider>;
}
