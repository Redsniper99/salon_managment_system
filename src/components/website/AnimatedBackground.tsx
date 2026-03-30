'use client';

import { useEffect, useState } from 'react';

interface FloatingItem {
    id: number;
    x: number;
    y: number;
    size: number;
    rotation: number;
    type: string;
    duration: number;
    delay: number;
}

export default function AnimatedBackground() {
    const [items, setItems] = useState<FloatingItem[]>([]);

    useEffect(() => {
        // Generate random floating salon items
        const types = ['✂️', '💇', '💅', '💄', '✨', '🌸'];
        const newItems: FloatingItem[] = [];

        for (let i = 0; i < 15; i++) {
            newItems.push({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 20 + 15,
                rotation: Math.random() * 360,
                type: types[Math.floor(Math.random() * types.length)],
                duration: Math.random() * 20 + 20,
                delay: Math.random() * 10,
            });
        }

        setItems(newItems);
    }, []);

    return (
        <div className="fixed inset-0 w-full h-full -z-50 overflow-hidden">
            {/* Animated gradient background */}
            <div
                className="absolute inset-0 animate-gradient"
                style={{
                    background: 'linear-gradient(-45deg, #1a1d17, #2d3328, #3a4535, #4B5945, #2d3328)',
                    backgroundSize: '400% 400%',
                }}
            />

            {/* Floating salon items */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="absolute opacity-10 animate-float"
                        style={{
                            left: `${item.x}%`,
                            top: `${item.y}%`,
                            fontSize: `${item.size}px`,
                            transform: `rotate(${item.rotation}deg)`,
                            animationDuration: `${item.duration}s`,
                            animationDelay: `${item.delay}s`,
                        }}
                    >
                        {item.type}
                    </div>
                ))}
            </div>

            {/* Overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
        </div>
    );
}
