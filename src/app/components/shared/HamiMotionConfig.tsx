import React, { useEffect, useState } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { loadOverlayMotion } from '@/app/motion/loadOverlayMotion';

type MotionConfigProps = { reducedMotion: 'always' | 'user'; children: React.ReactNode };

function MotionConfigBridge({ reducedMotion, children }: MotionConfigProps) {
    const [MotionConfig, setMotionConfig] = useState<React.ComponentType<MotionConfigProps> | null>(
        null,
    );

    useEffect(() => {
        let cancelled = false;
        void loadOverlayMotion().then((runtime) => {
            if (cancelled || !runtime?.MotionConfig) return;
            setMotionConfig(() => runtime.MotionConfig as React.ComponentType<MotionConfigProps>);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!MotionConfig) return <>{children}</>;
    return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>;
}

/** يطبّق prefers-reduced-motion بعد كشف الإقلاع — لا يسحب motion إلى مسار أول طلاء */
export function HamiMotionConfig({ children }: { children: React.ReactNode }) {
    const reduceMotion = useReduceMotion();

    return (
        <MotionConfigBridge reducedMotion={reduceMotion ? 'always' : 'user'}>
            {children}
        </MotionConfigBridge>
    );
}
