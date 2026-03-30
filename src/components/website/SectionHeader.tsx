'use client';

import { FadeIn } from '@/components/website/SectionReveal';
import { cn } from '@/lib/utils';

type Props = {
    eyebrow: string;
    title: string;
    description: string;
    className?: string;
    align?: 'center' | 'left';
};

export default function SectionHeader({ eyebrow, title, description, className, align = 'center' }: Props) {
    return (
        <FadeIn className={cn('mb-12 md:mb-16', align === 'center' && 'text-center', className)}>
            <div
                className={cn(
                    'flex items-center gap-3 md:gap-5 mb-5',
                    align === 'center' && 'justify-center'
                )}
            >
                <span
                    className={cn(
                        'h-px bg-gradient-to-r from-transparent to-primary-500/45',
                        align === 'center' ? 'w-10 md:w-20' : 'w-8 md:w-12'
                    )}
                />
                <p className="text-primary-300/90 text-[10px] sm:text-[11px] uppercase tracking-[0.38em] whitespace-nowrap">
                    {eyebrow}
                </p>
                <span
                    className={cn(
                        'h-px bg-gradient-to-l from-transparent to-primary-500/45',
                        align === 'center' ? 'w-10 md:w-20' : 'w-8 md:w-12'
                    )}
                />
            </div>
            <h2 className="font-display text-[1.75rem] sm:text-3xl md:text-4xl lg:text-[2.65rem] font-normal text-white tracking-tight leading-[1.12] max-w-3xl mx-auto">
                {title}
            </h2>
            <p
                className={cn(
                    'mt-4 md:mt-5 text-primary-100/58 text-sm md:text-[15px] leading-relaxed max-w-xl',
                    align === 'center' && 'mx-auto'
                )}
            >
                {description}
            </p>
        </FadeIn>
    );
}
