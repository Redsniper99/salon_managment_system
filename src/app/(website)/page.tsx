'use client';

import Navbar from '@/components/website/Navbar';
import HeroSection from '@/components/website/HeroSection';
import ServicesSection from '@/components/website/ServicesSection';
import GallerySection from '@/components/website/GallerySection';
import TestimonialsSection from '@/components/website/TestimonialsSection';
import MapContactSection from '@/components/website/MapContactSection';
import Footer from '@/components/website/Footer';
import HorizontalScrollSection from '@/components/website/HorizontalScrollSection';
import BookingCTA from '@/components/website/BookingCTA';
import { DividerMotion } from '@/components/website/SectionReveal';

export default function Home() {
    return (
        <>
            <div className="fixed inset-0 -z-20 bg-primary-950" />
            <div className="site-mesh" aria-hidden />
            <div className="site-atmosphere" aria-hidden />
            <div
                className="fixed inset-0 -z-10 pointer-events-none"
                aria-hidden
                style={{
                    background:
                        'radial-gradient(ellipse 100% 55% at 50% -18%, rgba(116, 150, 116, 0.16), transparent 58%), radial-gradient(ellipse 55% 45% at 100% 35%, rgba(75, 89, 69, 0.14), transparent 50%), radial-gradient(ellipse 50% 40% at 0% 75%, rgba(86, 120, 86, 0.1), transparent 48%)',
                }}
            />

            <main className="relative min-h-screen">
                <Navbar />
                <HeroSection />

                <DividerMotion />

                <HorizontalScrollSection />

                <DividerMotion />

                <ServicesSection />

                <DividerMotion />

                <GallerySection />

                <DividerMotion />

                <TestimonialsSection />

                <DividerMotion />

                <BookingCTA />

                <DividerMotion />

                <MapContactSection />

                <Footer />
            </main>
        </>
    );
}
