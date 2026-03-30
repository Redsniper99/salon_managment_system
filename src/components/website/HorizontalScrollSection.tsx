'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import SectionHeader from '@/components/website/SectionHeader';
import { FadeIn } from '@/components/website/SectionReveal';
import { cn } from '@/lib/utils';

const features = [
    {
        id: 1,
        title: 'Precision cutting',
        description:
            'Master stylists shape cuts to your face, texture, and routine—never one-size-fits-all.',
        image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=2069&auto=format&fit=crop',
    },
    {
        id: 2,
        title: 'Luxury color',
        description:
            'Balayage, gloss, and correction with premium color lines for shine and longevity.',
        image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=2026&auto=format&fit=crop',
    },
    {
        id: 3,
        title: 'Spa & wellness',
        description:
            'Calm treatment rooms for facials, massage, and reset moments away from the noise.',
        image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=2070&auto=format&fit=crop',
    },
    {
        id: 4,
        title: 'Bridal & events',
        description:
            'Trials, day-of styling, and packages so you feel composed from first look to last dance.',
        image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=2069&auto=format&fit=crop',
    },
];

export default function HorizontalScrollSection() {
    const reduce = useReducedMotion();

    return (
        <section
            id="expertise"
            className="relative z-10 py-20 md:py-28 px-4 bg-gradient-to-b from-primary-950/40 via-primary-900/25 to-primary-950/40"
        >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />
            <div className="container mx-auto max-w-6xl">
                <SectionHeader
                    eyebrow="Expertise"
                    title="Crafted with intention"
                    description="Four pillars of how we work—clear process, calm service, and results that feel like you."
                />

                <div className="flex flex-col gap-14 md:gap-20">
                    {features.map((feature, index) => (
                        <FadeIn key={feature.id} delay={index * 0.06} y={28}>
                            <article
                                className={cn(
                                    'group grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center p-6 sm:p-8 md:p-10 rounded-3xl border border-primary-800/45 bg-gradient-to-br from-primary-900/35 via-primary-950/60 to-primary-950/90 shadow-[0_20px_60px_-28px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04]',
                                    index % 2 === 1 && 'md:[&>*:first-child]:order-2'
                                )}
                            >
                                <motion.div
                                    className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-primary-700/35 bg-primary-900/40 shadow-inner"
                                    whileHover={reduce ? undefined : { scale: 1.01 }}
                                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    <Image
                                        src={feature.image}
                                        alt={feature.title}
                                        fill
                                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary-950/30 via-transparent to-primary-900/20 pointer-events-none" />
                                </motion.div>
                                <div className="space-y-5">
                                    <span className="font-display text-4xl md:text-5xl text-primary-500/45 tabular-nums">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <h3 className="font-display text-2xl md:text-3xl font-normal text-white tracking-tight">
                                        {feature.title}
                                    </h3>
                                    <p className="text-primary-100/58 text-sm md:text-[15px] leading-relaxed max-w-md">
                                        {feature.description}
                                    </p>
                                    <div className="flex items-center gap-3 pt-2">
                                        <span className="h-px w-10 bg-primary-500/40" />
                                        <span className="text-[11px] uppercase tracking-[0.25em] text-primary-400/70">
                                            Signature
                                        </span>
                                    </div>
                                </div>
                            </article>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    );
}
