'use client';

import { motion, useReducedMotion } from 'framer-motion';
import SectionHeader from '@/components/website/SectionHeader';
import { Stagger, StaggerItem } from '@/components/website/SectionReveal';

const testimonials = [
    {
        name: 'Sarah Johnson',
        rating: 5,
        text: 'Absolutely amazing experience! The staff is professional and the results exceeded my expectations.',
        service: 'Hair styling',
    },
    {
        name: 'Emily Chen',
        rating: 5,
        text: 'Best salon in town! My nails have never looked this good. Highly recommend!',
        service: 'Nail care',
    },
    {
        name: 'Maria Rodriguez',
        rating: 5,
        text: 'The bridal package was perfect for my wedding day. I felt like a princess!',
        service: 'Bridal',
    },
    {
        name: 'Jessica Lee',
        rating: 5,
        text: 'The spa treatment was so relaxing. I left feeling completely rejuvenated.',
        service: 'Spa',
    },
];

export default function TestimonialsSection() {
    const reduce = useReducedMotion();

    return (
        <section id="testimonials" className="py-20 md:py-28 px-4 relative z-10">
            <div className="container mx-auto max-w-6xl">
                <SectionHeader
                    eyebrow="Clients"
                    title="Loved by regulars"
                    description="Short notes from people who book again and again—consistency matters as much as the reveal."
                />

                <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {testimonials.map((testimonial, index) => (
                        <StaggerItem key={index}>
                            <motion.blockquote
                                className="relative h-full p-7 md:p-9 rounded-2xl border border-primary-800/50 bg-gradient-to-br from-primary-900/25 to-primary-950/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden"
                                whileHover={reduce ? undefined : { borderColor: 'rgba(86, 120, 86, 0.35)' }}
                                transition={{ duration: 0.25 }}
                            >
                                <span
                                    className="absolute top-6 right-7 font-display text-5xl text-primary-600/25 leading-none select-none"
                                    aria-hidden
                                >
                                    &ldquo;
                                </span>
                                <div className="flex gap-1 mb-5">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <svg
                                            key={i}
                                            className="w-4 h-4 text-primary-400 fill-current"
                                            viewBox="0 0 20 20"
                                            aria-hidden
                                        >
                                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                        </svg>
                                    ))}
                                </div>
                                <p className="text-primary-100/72 text-[15px] leading-relaxed mb-8 relative z-10">
                                    {testimonial.text}
                                </p>
                                <footer className="flex items-center justify-between gap-4 pt-6 border-t border-primary-800/50">
                                    <div>
                                        <cite className="not-italic font-medium text-white text-sm tracking-wide">
                                            {testimonial.name}
                                        </cite>
                                        <p className="text-primary-500/75 text-[11px] mt-1 uppercase tracking-[0.2em]">
                                            {testimonial.service}
                                        </p>
                                    </div>
                                    <div className="w-11 h-11 shrink-0 rounded-full border border-primary-600/40 bg-primary-900/50 flex items-center justify-center text-primary-200 text-sm font-display">
                                        {testimonial.name.charAt(0)}
                                    </div>
                                </footer>
                            </motion.blockquote>
                        </StaggerItem>
                    ))}
                </Stagger>
            </div>
        </section>
    );
}
