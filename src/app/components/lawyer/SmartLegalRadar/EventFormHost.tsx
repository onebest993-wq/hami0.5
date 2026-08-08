import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import type { EventForm } from '@/app/components/lawyer/SmartLegalRadar/EventForm';
import {
    getCachedRadarEventForm,
    loadRadarEventFormModule,
} from '@/app/runtime/radarWidgetLoader';
import { RADAR_FORM_OVERLAY, RADAR_FORM_PANEL, RADAR_FORM_ICON_BTN, RADAR_SKELETON } from './radarTheme';

type EventFormProps = React.ComponentProps<typeof EventForm>;
type EventFormComponent = React.ComponentType<EventFormProps>;

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

function EventFormLoadingShell({ onClose }: { onClose: () => void }): React.ReactElement {
    useBodyScrollLock(true);
    return createPortal(
        <div
            className={RADAR_FORM_OVERLAY}
            role="dialog"
            aria-modal="true"
            aria-busy="true"
            aria-label="جاري فتح نموذج الموعد"
            data-testid="radar-event-form-loading"
            onClick={onClose}
        >
            <div
                className={RADAR_FORM_PANEL}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#E2E8F0]">
                    <h2 className="font-bold text-lg text-[#121212]">إضافة موعد جديد</h2>
                    <button
                        type="button"
                        aria-label="إغلاق"
                        onClick={onClose}
                        className={RADAR_FORM_ICON_BTN}
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                    <Loader2 size={22} className="animate-spin text-[#64748B]" aria-hidden />
                    <p className="text-sm text-[#64748B]">جاري تجهيز النموذج…</p>
                </div>
            </div>
        </div>,
        document.body,
    );
}

/**
 * مضيف كسول لنموذج الموعد — يعرض قشرة فورية بدل فراغ عند أول فتح على Android.
 */
export function EventFormHost(props: EventFormProps): React.ReactElement | null {
    const { show, onClose } = props;
    const [Component, setComponent] = useState<EventFormComponent | null>(() =>
        getCachedRadarEventForm(),
    );

    useEffect(() => {
        if (!show) return;
        const cached = getCachedRadarEventForm();
        if (cached) {
            setComponent(() => cached);
            return;
        }
        if (Component) return;

        let cancelled = false;
        let attempts = 0;

        const adoptModule = () => {
            void loadRadarEventFormModule()
                .then((mod) => {
                    if (cancelled) return;
                    if (mod?.EventForm) {
                        setComponent(() => mod.EventForm);
                        return;
                    }
                    throw new Error('EventForm missing');
                })
                .catch(() => {
                    if (cancelled) return;
                    attempts += 1;
                    if (attempts < MAX_LOAD_ATTEMPTS) {
                        window.setTimeout(adoptModule, LOAD_RETRY_MS);
                        return;
                    }
                    SmartToast.error('تعذّر فتح نموذج الموعد — تحقق من الاتصال وأعد المحاولة');
                    onClose();
                });
        };

        adoptModule();
        return () => {
            cancelled = true;
        };
    }, [show, Component, onClose]);

    if (!show) return null;

    const ResolvedForm = Component ?? getCachedRadarEventForm();
    if (ResolvedForm) return <ResolvedForm {...props} />;

    return <EventFormLoadingShell onClose={onClose} />;
}
