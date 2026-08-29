import React, { useLayoutEffect, useRef } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { ExecutionArchiveXMark } from '../executionArchiveMarks';
import { isEvictionClaim } from '@/app/utils/isEvictionClaim';
import { ExecutionArchivePartyBlock } from './ExecutionArchivePartyBlock';
import type { LooseArchiveFile } from '../types';
import {
    executionClaimBadgeArabic,
    resolveExecutionArchiveCardView,
} from '../executionArchiveCardView';
import { warmExecutionDossierFromArchiveCard } from '../executionArchiveCardIntentWarm';
import {
    EXECUTION_ARCHIVE_PREVIEW_LAYER_TEST_ID,
    EXECUTION_ARCHIVE_PREVIEW_OVERLAY_CLASS,
    EXECUTION_ARCHIVE_PREVIEW_PANEL_CLASS,
} from '../executionArchivePreviewLayer';

type ArchivePortalExecutionPreviewModalProps = {
    file: LooseArchiveFile;
    onClose: () => void;
    onOpenFull: (file: LooseArchiveFile) => void;
};

const PREVIEW_TITLE_ID = 'execution-archive-preview-title';

export function ArchivePortalExecutionPreviewModal({
    file,
    onClose,
    onOpenFull,
}: ArchivePortalExecutionPreviewModalProps) {
    const cardView = resolveExecutionArchiveCardView(file);
    const [previewTimelineEvents, setPreviewTimelineEvents] = React.useState<
        NonNullable<LooseArchiveFile['timelineEvents']>
    >(() => (Array.isArray(file.timelineEvents) ? file.timelineEvents : []));
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const ignoreBackdropUntilRef = useRef(0);

    useBodyScrollLock(true);

    useLayoutEffect(() => {
        ignoreBackdropUntilRef.current = performance.now() + 400;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            onCloseRef.current();
        };

        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            onCloseRef.current();
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        void import('../executionArchivePreviewTimeline')
            .then((m) => {
                if (cancelled) return;
                setPreviewTimelineEvents(m.mergedPreviewTimelineEvents(file));
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [file]);

    const demandAmount =
        cardView.demandLabel === 'متبقي الوعاء' ? cardView.remainingDemand : cardView.totalDemand;
    const demandFormatted =
        cardView.demandLabel === 'متبقي الوعاء' || demandAmount > 0
            ? new Intl.NumberFormat('ar-IQ').format(Math.round(demandAmount)) + ' د.ع'
            : '—';

    return (
        <div
            className={EXECUTION_ARCHIVE_PREVIEW_OVERLAY_CLASS}
            data-testid={EXECUTION_ARCHIVE_PREVIEW_LAYER_TEST_ID}
            data-hami-overlay-safe="1"
            role="presentation"
            onClick={() => {
                if (performance.now() < ignoreBackdropUntilRef.current) return;
                onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={PREVIEW_TITLE_ID}
                data-testid="execution-archive-preview-dialog"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className={EXECUTION_ARCHIVE_PREVIEW_PANEL_CLASS}
            >
                <div className="flex items-center justify-between border-b border-white/10 p-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="إغلاق تفاصيل الإضبارة"
                        className="p-2 rounded-lg min-h-[44px] min-w-[44px] touch-manipulation"
                    >
                        <ExecutionArchiveXMark className="text-white" size={20} />
                    </button>
                    <h3 id={PREVIEW_TITLE_ID} className="text-[#E6C673] font-bold text-sm">
                        تفاصيل وسجل زمني
                    </h3>
                </div>
                <div className="p-5 overflow-y-auto text-right space-y-4 flex-1 min-h-0">
                    <div>
                        <p className="text-white/50 text-xs mb-1">نوع الإضبارة</p>
                        <p className="text-white font-bold">{executionClaimBadgeArabic(file)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <p className="text-white/50">رقم الإضبارة</p>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <p className="text-white font-mono">
                                    {file.fileNumber || file.caseNo || '—'} /{' '}
                                    {file.year || file.fileYear || new Date().getFullYear()}
                                </p>
                                <span className="text-[10px] font-bold text-emerald-300">
                                    {cardView.dossierLifecycleBadge}
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="text-white/50">{cardView.demandLabel}</p>
                            <p className="text-[#E6C673] font-bold tabular-nums">{demandFormatted}</p>
                        </div>
                    </div>
                    <div>
                        {cardView.directorateLabel ? (
                            <p className="mb-3 text-right text-xs">
                                <span className="text-white/50">مديرية التنفيذ: </span>
                                <span className="font-bold text-slate-100">{cardView.directorateLabel}</span>
                            </p>
                        ) : null}
                        <ExecutionArchivePartyBlock
                            view={cardView}
                            className="mb-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                        />
                    </div>
                    {isEvictionClaim(String(file.claimType || file.docType || '')) && (
                        <div className="rounded-xl border border-blue-500/25 bg-blue-950/20 p-3 space-y-1">
                            <p className="text-blue-300 text-xs font-bold">بيانات العقار</p>
                            <p className="text-slate-300 text-xs">
                                رقم {file.property_number || '—'} — مقاطعة {file.district || '—'}
                            </p>
                            <p className="text-slate-400 text-[11px] leading-relaxed">
                                صنف: {file.property_type || '—'}
                            </p>
                            <p className="text-slate-400 text-[11px] leading-relaxed">
                                {file.full_address || '—'}
                            </p>
                        </div>
                    )}
                    <div>
                        <p className="text-white/50 text-xs mb-2">
                            السجل الزمني (من آخر الأحداث)
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
                            {previewTimelineEvents.length > 0 ? (
                                previewTimelineEvents.slice(0, 25).map((ev, idx) => (
                                    <div
                                        key={ev.id || String(idx)}
                                        className="text-right border-b border-white/5 pb-2 last:border-0"
                                    >
                                        <p className="text-[#E6C673] text-[11px] font-semibold">
                                            {ev.title || 'حدث'}
                                        </p>
                                        {ev.description && (
                                            <p className="text-slate-400 text-[10px] mt-0.5 leading-relaxed">
                                                {ev.description}
                                            </p>
                                        )}
                                        <p className="text-slate-600 text-[9px] mt-1 font-mono">
                                            {ev.date || ev.timestamp || ''}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-500 text-xs text-center py-4">
                                    لا توجد أحداث في الملف المخزّن أو في ذاكرة الجلسة لهذه الإضبارة — افتح اللوحة
                                    لإكمال السجل.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-white/10 shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            warmExecutionDossierFromArchiveCard('urgent');
                            onOpenFull(file);
                        }}
                        className="w-full min-h-[44px] rounded-xl bg-[#E6C673] text-[#0B1021] font-bold text-sm touch-manipulation"
                    >
                        فتح لوحة الإضبارة الكاملة
                    </button>
                </div>
            </div>
        </div>
    );
}
