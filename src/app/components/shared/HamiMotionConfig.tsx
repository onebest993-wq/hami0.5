import React, { useEffect, useState } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

type MotionConfigProps = { reducedMotion: 'always' | 'user'; children: React.ReactNode };

function MotionConfigBridge({ reducedMotion, children }: MotionConfigProps) {
    const [MotionConfig, setMotionConfig] = useState<React.ComponentType<MotionConfigProps> | null>(null);

    useEffect(() => {
        void import('motion/react').then((m) => {
            const Config = (m as { MotionConfig?: React.ComponentType<MotionConfigProps> }).MotionConfig;
            if (Config) setMotionConfig(() => Config);
        });
    }, []);

    if (!MotionConfig) return <>{children}</>;
    return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>;
}

/** يطبّق prefers-reduced-motion بعد أول paint — لا يسحب motion إلى مسار الإقلاع */
export function HamiMotionConfig({ children }: { children: React.ReactNode }) {
    const reduceMotion = useReduceMotion();

    return (
        <MotionConfigBridge reducedMotion={reduceMotion ? 'always' : 'user'}>
            {children}
        </MotionConfigBridge>
    );
}
