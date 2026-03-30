import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './website-globals.css';
import WebsiteProviders from '@/components/website/Providers';

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
    display: 'swap',
});

const playfair = Playfair_Display({
    variable: '--font-display',
    subsets: ['latin'],
    weight: ['400', '600', '700', '800'],
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'SalonFlow - Luxury Salon Services',
    description:
        'Experience luxury salon services where beauty meets elegance. Professional hair styling, nail care, spa treatments, and more.',
};

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={`${inter.variable} ${playfair.variable} scroll-smooth antialiased`}>
            <WebsiteProviders>{children}</WebsiteProviders>
        </div>
    );
}
