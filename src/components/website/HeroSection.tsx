'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Stagger, StaggerItem } from '@/components/website/SectionReveal';

const collage = {
    main: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&auto=format&fit=crop',
    accent: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop',
};

const stats = [
    { label: 'Google rating', value: '4.9' },
    { label: 'Years in service', value: '12+' },
    { label: 'Returning guests', value: '78%' },
];

export default function HeroSection() {
    const reduce = useReducedMotion();

    return (
        <section
            id="home"
            className="relative w-full min-h-[min(92vh,880px)] flex flex-col justify-center px-4 sm:px-6 pt-28 pb-20 md:pt-32 md:pb-24 overflow-hidden"
        >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_70%_-10%,rgba(116,150,116,0.12),transparent_55%)] pointer-events-none" />

            <div className="container mx-auto max-w-6xl relative z-10">
                <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 xl:gap-20 items-center">
                    <Stagger className="text-center lg:text-left max-w-xl mx-auto lg:mx-0">
                        <StaggerItem>
                            <p className="text-primary-300/90 text-[10px] sm:text-[11px] uppercase tracking-[0.42em] mb-6">
                                Salon &amp; spa · New York
                            </p>
                        </StaggerItem>
                        <StaggerItem>
                            <h1 className="font-display text-[2.35rem] sm:text-5xl md:text-6xl xl:text-[3.5rem] font-normal text-white tracking-tight leading-[1.06]">
                                Beauty,{' '}
                                <span className="gradient-text">quietly</span>
                                <br className="hidden sm:block" /> elevated.
                            </h1>
                        </StaggerItem>
                        <StaggerItem>
                            <p className="mt-6 text-primary-100/62 text-[15px] sm:text-base leading-relaxed lg:max-w-md">
                                Hair, nails, and wellness in a calm studio—appointment-led, detail-obsessed,
                                and tailored to how you live.
                            </p>
                        </StaggerItem>
                        <StaggerItem>
                            <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                                <Link
                                    href="/booking"
                                    className="inline-flex justify-center items-center px-8 py-3.5 bg-primary-600 text-white text-sm font-medium tracking-wide border border-primary-400/35 shadow-[0_12px_40px_-12px_rgba(75,89,69,0.65)] hover:bg-primary-500 hover:shadow-[0_16px_48px_-12px_rgba(86,120,86,0.45)] transition-all duration-300"
                                >
                                    Book an appointment
                                </Link>
                                <a
                                    href="#services"
                                    className="inline-flex justify-center items-center px-8 py-3.5 text-primary-50/90 text-sm font-medium tracking-wide border border-primary-400/30 bg-primary-950/30 hover:bg-primary-900/50 hover:border-primary-400/45 transition-all duration-300 backdrop-blur-sm"
                                >
                                    Explore services
                                </a>
                            </div>
                        </StaggerItem>
                        <StaggerItem>
                            <dl className="mt-12 grid grid-cols-3 gap-4 pt-10 border-t border-primary-800/55 max-w-md mx-auto lg:mx-0">
                                {stats.map((s) => (
                                    <div key={s.label} className="text-center lg:text-left">
                                        <dt className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-primary-100/40 mb-1.5">
                                            {s.label}
                                        </dt>
                                        <dd className="font-display text-xl sm:text-2xl text-white tabular-nums">{s.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </StaggerItem>
                    </Stagger>

                    <div className="relative sm:hidden mt-10 h-52 w-full max-w-lg mx-auto rounded-2xl overflow-hidden border border-primary-700/40 shadow-xl">
                        <Image
                            src={collage.main}
                            alt="Salon interior"
                            fill
                            className="object-cover"
                            sizes="100vw"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-primary-950/60 to-transparent pointer-events-none" />
                    </div>

                    <motion.div
                        className="relative mx-auto w-full max-w-md lg:max-w-none h-[340px] sm:h-[400px] lg:h-[min(520px,58vh)] hidden sm:block"
                        initial={reduce ? false : { opacity: 0, scale: 0.98 }}
                        animate={reduce ? undefined : { opacity: 1, scale: 1 }}
                        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
                    >
                        <div className="absolute top-0 right-0 w-[72%] h-[88%] rounded-2xl overflow-hidden border border-primary-600/35 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.06]">
                            <Image
                                src={collage.main}
                                alt="Salon interior"
                                fill
                                className="object-cover transition-transform duration-700 ease-out hover:scale-[1.03]"
                                sizes="(max-width: 1024px) 400px, 50vw"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-primary-950/50 via-transparent to-transparent pointer-events-none" />
                        </div>
                        <div className="absolute bottom-0 left-0 w-[52%] h-[48%] rounded-2xl overflow-hidden border border-primary-500/40 shadow-2xl ring-1 ring-white/[0.05]">
                            <Image
                                src={collage.accent}
                                alt="Styling detail"
                                fill
                                className="object-cover transition-transform duration-700 ease-out hover:scale-[1.04]"
                                sizes="(max-width: 1024px) 280px, 35vw"
                            />
                        </div>
                        <div className="absolute -bottom-3 left-[42%] translate-x-[-50%] px-4 py-2 bg-primary-950/85 backdrop-blur-md border border-primary-700/45 text-[11px] tracking-[0.2em] uppercase text-primary-200/90 whitespace-nowrap shadow-lg">
                            Same-week openings
                        </div>
                    </motion.div>
                </div>
            </div>

            <motion.div
                className="absolute bottom-6 left-1/2 -translate-x-1/2 text-primary-400/45"
                animate={reduce ? undefined : { y: [0, 7, 0] }}
                transition={reduce ? undefined : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
            </motion.div>
        </section>
    );
}
