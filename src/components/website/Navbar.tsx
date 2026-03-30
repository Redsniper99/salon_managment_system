'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface NavbarProps {
    alwaysVisible?: boolean;
}

export default function Navbar({ alwaysVisible = false }: NavbarProps) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [hideForAppointment, setHideForAppointment] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (alwaysVisible) {
            setHideForAppointment(false);
            return;
        }

        const handleScroll = () => {
            setIsScrolled(window.scrollY > 24);

            const appointmentSection = document.getElementById('appointment');
            if (appointmentSection && isMobile) {
                const rect = appointmentSection.getBoundingClientRect();
                const isInSection = rect.top <= 100 && rect.bottom >= window.innerHeight / 2;
                setHideForAppointment(isInSection);
            } else {
                setHideForAppointment(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMobile, alwaysVisible]);

    const navLinks = [
        { name: 'Home', href: '#home' },
        { name: 'Services', href: '#services' },
        { name: 'Gallery', href: '#gallery' },
        { name: 'Testimonials', href: '#testimonials' },
        { name: 'Contact', href: '#contact' },
    ];

    const shouldHide = !alwaysVisible && hideForAppointment && isMobile;

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
                isScrolled || alwaysVisible
                    ? 'bg-primary-950/92 backdrop-blur-md border-b border-primary-800/50 py-3'
                    : 'bg-transparent border-b border-transparent py-5 md:py-6'
            } ${shouldHide ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
                <div className="flex items-center justify-between">
                    <a href="#home" className="flex items-center gap-3 group">
                        <div className="w-11 h-11 relative shrink-0">
                            <Image src="/logo.svg" alt="SalonFlow" fill className="object-contain" />
                        </div>
                        <span className="font-display text-xl sm:text-2xl text-white tracking-wide">SalonFlow</span>
                    </a>

                    <div className="hidden md:flex items-center gap-10">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="text-primary-100/75 hover:text-primary-300 text-xs font-medium tracking-[0.2em] uppercase transition-colors"
                            >
                                {link.name}
                            </a>
                        ))}
                        <Link
                            href="/booking"
                            className="px-6 py-2.5 bg-primary-600 text-white text-xs font-medium tracking-wide uppercase border border-primary-500/40 hover:bg-primary-500 transition-colors"
                        >
                            Book
                        </Link>
                    </div>

                    <button
                        type="button"
                        className="md:hidden text-primary-100 p-2 border border-primary-800/60 hover:border-primary-600/50 transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-expanded={isMobileMenuOpen}
                        aria-label="Toggle menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {isMobileMenuOpen && (
                    <div className="md:hidden mt-4 pt-4 border-t border-primary-800/50 flex flex-col gap-1 pb-2">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="text-primary-100/85 hover:bg-white/[0.04] py-3 px-2 text-sm tracking-wide transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </a>
                        ))}
                        <Link
                            href="/booking"
                            className="mt-3 text-center py-3 bg-primary-600 text-white text-sm font-medium border border-primary-500/40"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Book appointment
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
