import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SettingsSectionId } from '@/app/services/settings/types';
import { isLaidOutSettingsInteractive } from '@/app/runtime/settingsInstantPaintHostAdopt';
import { SettingsSectionInstantSlots } from './SettingsSectionInstantSlots';

/**
 * أول فتح: الفتحات في التدفق (لا absolute ينهار فوق بطاقة بلا ارتفاع).
 * المحتوى يُخطَّط بشفافية حتى يمتلئ، ثم يُكشف.
 */
export function SettingsSectionReveal({
    sectionId,
    onReady,
    children,
}: {
    sectionId: SettingsSectionId;
    onReady: (id: SettingsSectionId) => void;
    children: React.ReactNode;
}) {
    const [cover, setCover] = useState(true);
    const rootRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        let cancelled = false;
        let observer: ResizeObserver | undefined;

        const finish = () => {
            if (cancelled) return;
            cancelled = true;
            observer?.disconnect();
            setCover(false);
        };

        const tryReveal = () => {
            if (cancelled) return;
            const interactive = root.querySelector('[data-settings-interactive="true"]');
            if (!(interactive instanceof HTMLElement)) return;
            if (!isLaidOutSettingsInteractive(interactive)) return;
            finish();
        };

        tryReveal();

        let second = 0;
        const first = requestAnimationFrame(() => {
            second = requestAnimationFrame(tryReveal);
        });
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(tryReveal);
            observer.observe(root);
        }

        return () => {
            cancelled = true;
            cancelAnimationFrame(first);
            cancelAnimationFrame(second);
            observer?.disconnect();
        };
    }, []);

    useEffect(() => {
        if (cover) return;
        onReady(sectionId);
    }, [cover, onReady, sectionId]);

    return (
        <div ref={rootRef} className="relative">
            {cover ? (
                <div data-settings-section-cover="1">
                    <SettingsSectionInstantSlots />
                </div>
            ) : null}
            <div
                className={
                    cover ? 'pointer-events-none absolute inset-inline-0 top-0 opacity-0' : undefined
                }
                aria-hidden={cover}
            >
                {children}
            </div>
        </div>
    );
}
