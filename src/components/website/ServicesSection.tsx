'use client';

import { motion, useReducedMotion } from 'framer-motion';
import SectionHeader from '@/components/website/SectionHeader';
import { Stagger, StaggerItem } from '@/components/website/SectionReveal';

const services = [
    {
        icon: '✂️',
        title: 'Hair styling',
        description: 'Cuts, color, and styling for every texture and lifestyle.',
    },
    {
        icon: '💅',
        title: 'Nail care',
        description: 'Manicures, pedicures, and art with meticulous hygiene.',
    },
    {
        icon: '💆',
        title: 'Spa treatments',
        description: 'Facials, massage, and body rituals in a quiet, low-lit room.',
    },
    {
        icon: '💄',
        title: 'Makeup',
        description: 'Editorial, event, and everyday looks tailored to you.',
    },
    {
        icon: '👰',
        title: 'Bridal',
        description: 'Trials and day-of packages for you and your party.',
    },
    {
        icon: '🧖',
        title: 'Skin care',
        description: 'Consultations and advanced treatments for lasting radiance.',
    },
];

export default function ServicesSection() {
    const reduce = useReducedMotion();

    return (
        <section id="services" className="py-20 md:py-28 px-4 relative z-10">
            <div className="container mx-auto max-w-6xl">
                <SectionHeader
                    eyebrow="Services"
                    title="Everything in one studio"
                    description="Browse by category, then book the exact services you want—no guesswork, no rush."
                />

                <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                    {services.map((service, index) => (
                        <StaggerItem key={index}>
                            <motion.article
                                className="h-full flex flex-col p-7 md:p-8 rounded-2xl border border-primary-800/50 bg-gradient-to-b from-primary-900/30 to-primary-950/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-primary-600/45 hover:shadow-[0_16px_48px_-24px_rgba(0,0,0,0.55)] transition-colors duration-300"
                                whileHover={reduce ? undefined : { y: -4 }}
                                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-primary-800/70 ring-1 ring-primary-500/25 flex items-center justify-center text-2xl mb-5">
                                    {service.icon}
                                </div>
                                <h3 className="font-display text-lg md:text-xl text-white mb-2 tracking-tight">
                                    {service.title}
                                </h3>
                                <p className="text-primary-100/55 text-sm leading-relaxed flex-1">
                                    {service.description}
                                </p>
                                <a
                                    href="/booking"
                                    className="inline-flex items-center gap-2 mt-6 text-xs font-medium uppercase tracking-[0.22em] text-primary-400 hover:text-primary-300 transition-colors group/link"
                                >
                                    Reserve
                                    <span
                                        className="inline-block transition-transform duration-300 group-hover/link:translate-x-0.5"
                                        aria-hidden
                                    >
                                        →
                                    </span>
                                </a>
                            </motion.article>
                        </StaggerItem>
                    ))}
                </Stagger>
            </div>
        </section>
    );
}
