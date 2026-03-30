'use client';

import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

const ease = [0.22, 1, 0.36, 1] as const;

export function FadeIn({
    children,
    className,
    delay = 0,
    y = 20,
}: {
    children: ReactNode;
    className?: string;
    delay?: number;
    y?: number;
}) {
    const reduce = useReducedMotion();

    return (
        <motion.div
            className={className}
            initial={reduce ? false : { opacity: 0, y }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px', amount: 0.15 }}
            transition={{
                duration: reduce ? 0 : 0.55,
                delay: reduce ? 0 : delay,
                ease,
            }}
        >
            {children}
        </motion.div>
    );
}

export function Stagger({
    children,
    className,
    stagger = 0.08,
}: {
    children: ReactNode;
    className?: string;
    stagger?: number;
}) {
    const reduce = useReducedMotion();

    return (
        <motion.div
            className={className}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px', amount: 0.08 }}
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: reduce ? 0 : stagger,
                        delayChildren: reduce ? 0 : 0.04,
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    const reduce = useReducedMotion();

    return (
        <motion.div
            className={className}
            variants={{
                hidden: { opacity: reduce ? 1 : 0, y: reduce ? 0 : 14 },
                visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: reduce ? 0 : 0.42, ease },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

export function ScaleIn({ children, className }: { children: ReactNode; className?: string }) {
    const reduce = useReducedMotion();

    return (
        <motion.div
            className={className}
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: reduce ? 0 : 0.5, ease }}
        >
            {children}
        </motion.div>
    );
}

export function DividerMotion({ className }: { className?: string }) {
    const reduce = useReducedMotion();

    return (
        <motion.div
            className={cn('flex flex-col items-center gap-3 py-8 md:py-10', className)}
            aria-hidden
            initial={reduce ? false : { opacity: 0 }}
            whileInView={reduce ? undefined : { opacity: 1 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.4 }}
        >
            <motion.div
                className="h-px w-[min(100%,18rem)] origin-center bg-gradient-to-r from-transparent via-primary-400/40 to-transparent"
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={reduce ? undefined : { scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: reduce ? 0 : 0.7, ease }}
            />
            <div className="h-1 w-1 rounded-full bg-primary-400/50 shadow-[0_0_12px_rgba(116,150,116,0.35)]" />
        </motion.div>
    );
}
