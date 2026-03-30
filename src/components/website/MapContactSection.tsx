'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import SectionHeader from '@/components/website/SectionHeader';
import { FadeIn, Stagger, StaggerItem } from '@/components/website/SectionReveal';

const contactInfo = [
    {
        icon: '📍',
        title: 'Visit us',
        details: ['123 Beauty Boulevard', 'Downtown Fashion District', 'New York, NY 10001'],
    },
    {
        icon: '📞',
        title: 'Call',
        details: ['+1 (555) 123-4567', '+1 (555) 987-6543'],
    },
    {
        icon: '✉️',
        title: 'Email',
        details: ['hello@salonflow.com', 'bookings@salonflow.com'],
    },
    {
        icon: '🕐',
        title: 'Hours',
        details: ['Mon–Fri: 9:00 AM – 8:00 PM', 'Sat: 10:00 AM – 6:00 PM', 'Sun: Closed'],
    },
];

export default function MapContactSection() {
    const [mapLoaded, setMapLoaded] = useState(false);
    const reduce = useReducedMotion();

    return (
        <section
            id="contact"
            className="relative py-20 md:py-28 px-4 z-10 bg-gradient-to-b from-transparent via-primary-950/50 to-primary-950"
        >
            <div className="container mx-auto max-w-6xl">
                <SectionHeader
                    eyebrow="Contact"
                    title="Visit or write to us"
                    description="We reply within one business day. For same-day openings, call the front desk."
                />

                <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
                    <FadeIn y={24}>
                        <div className="relative min-h-[400px] h-full border border-primary-800/50 bg-primary-900/25 overflow-hidden rounded-2xl shadow-[0_24px_60px_-28px_rgba(0,0,0,0.5)]">
                            {!mapLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center bg-primary-950 z-10">
                                    <p className="text-primary-100/45 text-sm">Loading map…</p>
                                </div>
                            )}
                            <iframe
                                title="SalonFlow location"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.9663095343008!2d-74.00425878428698!3d40.74076904379132!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259bf5c1654f3%3A0xc80f9cfce5383d5d!2sGoogle!5e0!3m2!1sen!2sus!4v1635959481234!5m2!1sen!2sus"
                                width="100%"
                                height="100%"
                                style={{ border: 0, minHeight: '400px', filter: 'grayscale(20%) brightness(0.94)' }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                className={mapLoaded ? 'opacity-100' : 'opacity-0'}
                                onLoad={() => setMapLoaded(true)}
                            />
                            <div className="absolute top-4 left-4 z-20 px-3 py-2 bg-primary-950/90 border border-primary-700/45 text-[11px] tracking-[0.15em] uppercase text-primary-100/90">
                                SalonFlow Studio
                            </div>
                            <motion.a
                                href="https://maps.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-4 right-4 z-20 px-5 py-2.5 bg-primary-600 text-white text-xs font-medium tracking-wide border border-primary-500/35 shadow-lg"
                                whileHover={reduce ? undefined : { scale: 1.03 }}
                                whileTap={reduce ? undefined : { scale: 0.98 }}
                            >
                                Directions
                            </motion.a>
                        </div>
                    </FadeIn>

                    <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {contactInfo.map((info, index) => (
                            <StaggerItem key={index}>
                                <motion.div
                                    className="border border-primary-800/50 bg-gradient-to-b from-primary-900/20 to-primary-950/80 p-6 md:p-7 rounded-xl h-full hover:border-primary-700/55 transition-colors duration-300"
                                    whileHover={reduce ? undefined : { y: -2 }}
                                >
                                    <div className="text-2xl mb-4 opacity-90">{info.icon}</div>
                                    <h3 className="font-display text-lg text-white mb-3">{info.title}</h3>
                                    <div className="space-y-1">
                                        {info.details.map((detail, i) => (
                                            <p key={i} className="text-primary-100/55 text-sm leading-relaxed">
                                                {detail}
                                            </p>
                                        ))}
                                    </div>
                                </motion.div>
                            </StaggerItem>
                        ))}
                    </Stagger>
                </div>
            </div>
        </section>
    );
}
