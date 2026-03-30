'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { FadeIn } from '@/components/website/SectionReveal';

const chips = ['Online booking', 'Pick your stylist', 'Instant email'];

export default function BookingCTA() {
    const reduce = useReducedMotion();

    return (
        <section id="book" className="relative py-24 md:py-32 overflow-hidden border-y border-primary-800/50">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 via-primary-950 to-primary-950" />
            <motion.div
                className="absolute -top-24 right-0 w-[420px] h-[420px] rounded-full bg-primary-500/10 blur-3xl"
                animate={reduce ? undefined : { opacity: [0.4, 0.65, 0.4] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
            />
            <motion.div
                className="absolute -bottom-32 left-10 w-[360px] h-[360px] rounded-full bg-primary-600/10 blur-3xl"
                animate={reduce ? undefined : { opacity: [0.35, 0.55, 0.35] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                aria-hidden
            />

            <FadeIn className="container mx-auto px-4 relative z-10 max-w-3xl text-center">
                <p className="text-primary-300/90 text-[11px] uppercase tracking-[0.35em] mb-5">Reservations</p>
                <h2 className="font-display text-[1.85rem] sm:text-3xl md:text-4xl lg:text-[2.65rem] font-normal text-white tracking-tight mb-5">
                    Ready when you are
                </h2>
                <p className="text-primary-100/58 text-sm md:text-[15px] leading-relaxed mb-10 max-w-lg mx-auto">
                    Pick a time that fits your week. You&apos;ll see open chairs, services, and pricing before you
                    confirm—no surprises at the desk.
                </p>

                <div className="flex flex-wrap justify-center gap-2.5 mb-11">
                    {chips.map((label) => (
                        <span
                            key={label}
                            className="px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-primary-100/65 border border-primary-700/50 rounded-full bg-primary-950/40 backdrop-blur-sm"
                        >
                            {label}
                        </span>
                    ))}
                </div>

                <motion.div whileHover={reduce ? undefined : { scale: 1.02 }} whileTap={reduce ? undefined : { scale: 0.98 }}>
                    <Link
                        href="/booking"
                        className="inline-flex items-center gap-2.5 px-11 py-4 bg-primary-600 text-white text-sm font-medium tracking-wide border border-primary-400/35 shadow-[0_14px_44px_-12px_rgba(75,89,69,0.7)] hover:bg-primary-500 hover:shadow-[0_18px_50px_-12px_rgba(86,120,86,0.45)] transition-all duration-300"
                    >
                        Book your visit
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </motion.div>
                <p className="mt-8 text-primary-100/38 text-xs tracking-wide">Guest checkout · under two minutes</p>
            </FadeIn>
        </section>
    );
}
