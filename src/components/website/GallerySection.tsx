'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import SectionHeader from '@/components/website/SectionHeader';
import { FadeIn } from '@/components/website/SectionReveal';
import { cn } from '@/lib/utils';

const galleryImages = [
    {
        id: 1,
        alt: 'Salon interior',
        src: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop',
    },
    {
        id: 2,
        alt: 'Hair styling',
        src: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1969&auto=format&fit=crop',
    },
    {
        id: 3,
        alt: 'Nail art',
        src: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=1974&auto=format&fit=crop',
    },
    {
        id: 4,
        alt: 'Spa treatment',
        src: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop',
    },
    {
        id: 5,
        alt: 'Makeup session',
        src: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?q=80&w=1971&auto=format&fit=crop',
    },
    {
        id: 6,
        alt: 'Hair coloring',
        src: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?q=80&w=1974&auto=format&fit=crop',
    },
    {
        id: 7,
        alt: 'Bridal beauty',
        src: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop',
    },
    {
        id: 8,
        alt: 'Salon detail',
        src: 'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?q=80&w=1974&auto=format&fit=crop',
    },
];

const placementMd = [
    'md:col-span-2 md:row-span-2 md:min-h-[260px]',
    'md:col-start-3 md:row-start-1',
    'md:col-start-4 md:row-start-1',
    'md:col-start-3 md:row-start-2',
    'md:col-start-4 md:row-start-2',
    'md:col-start-1 md:row-start-3',
    'md:col-start-2 md:row-start-3',
    'md:col-start-3 md:row-start-3',
];

export default function GallerySection() {
    const reduce = useReducedMotion();

    return (
        <section
            id="gallery"
            className="py-20 md:py-28 px-4 relative z-10 bg-gradient-to-b from-transparent via-primary-900/20 to-transparent"
        >
            <div className="container mx-auto max-w-6xl">
                <SectionHeader
                    eyebrow="Gallery"
                    title="Inside the studio"
                    description="Texture, light, and the small details that make visits feel considered—not rushed."
                />

                <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-3 gap-2 md:gap-3">
                    {galleryImages.map((image, i) => (
                        <FadeIn
                            key={image.id}
                            delay={i * 0.04}
                            y={16}
                            className={cn(
                                'min-h-[140px] md:min-h-0',
                                i === 0 && 'col-span-2 row-span-2 min-h-[200px]',
                                placementMd[i]
                            )}
                        >
                            <motion.div
                                className={cn(
                                    'relative h-full w-full overflow-hidden rounded-xl border border-primary-800/45 bg-primary-900/30 group min-h-[inherit]',
                                    i === 0 && 'md:rounded-2xl'
                                )}
                                whileHover={reduce ? undefined : { scale: 1.015 }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <Image
                                    src={image.src}
                                    alt={image.alt}
                                    fill
                                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                                    sizes={
                                        i === 0
                                            ? '(max-width: 768px) 100vw, 50vw'
                                            : '(max-width: 768px) 50vw, 25vw'
                                    }
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary-950/80 via-primary-950/10 to-transparent pointer-events-none" />
                                <p className="absolute bottom-2.5 left-2.5 right-2.5 text-[10px] md:text-[11px] text-white/90 font-medium tracking-wide">
                                    {image.alt}
                                </p>
                            </motion.div>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    );
}
