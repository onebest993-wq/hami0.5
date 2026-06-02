import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Pin, ShieldAlert, X } from 'lucide-react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { ClientRequestService } from '@/app/services/ClientRequestService';
import { RequestStatus } from '@/app/types/admin-types';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { buildPinFromSecretaryAlert } from '@/app/workspace/buildPinFromSecretaryAlert';
import { inferUrgencyTone, urgencyToneStyles } from './alertCardUtils';
import type { SmartAlert } from './types';

function isMeaningfulDeepDive(text: string, summary: string): boolean {
    const t = text.trim();
    if (t.length < 48) return false;
    if (t === summary.trim()) return false;
    return true;
}

/** نص إضافي للتفاصيل دون تكرار العنوان والسبب */
function extraDeepDiveText(source: SecretaryAlert, summary: string): string | null {
    const raw = source.aiDeepDive?.trim() || '';
    if (!isMeaningfulDeepDive(raw, summary)) return null;
    const reason = source.alertReason?.trim() || '';
    if (reason && raw.includes(reason)) {
        const rest = raw.replace(reason, '').trim();
        return rest.length >= 24 ? rest : null;
    }
    if (raw.startsWith('موعد في التقويم:')) {
        const rest = raw.replace(/^موعد في التقويم:\s*/u, '').trim();
        return rest.length >= 24 ? rest : null;
    }
    return raw;
}

interface AlertCardItemProps {
    alert: SmartAlert;
    source: SecretaryAlert;
    onDismiss: (alertId: string) => void;
    onNavigate: (source: SecretaryAlert) => void;
    onAcceptedConvertToCase?: (source: SecretaryAlert) => void;
    onResolved?: (source: SecretaryAlert) => void;
}

export const AlertCardItem: React.FC<AlertCardItemProps> = React.memo(({
    alert,
    source,
    onDismiss,
    onNavigate,
    onAcceptedConvertToCase,
    onResolved,
}) => {
    const tone = useMemo(() => inferUrgencyTone(source), [source]);
    const styles = useMemo(() => urgencyToneStyles(tone), [tone]);
    const [showDetails, setShowDetails] = useState(false);
    // قفل anti-double-click لطلبات العميل (in-flight)
    const [isProcessingRequest, setIsProcessingRequest] = useState(false);
    const togglePin = useWorkspaceStore((s) => s.togglePin);
    const isPinned = useWorkspaceStore((s) => s.isPinned);

    // Escape لإغلاق modal التفاصيل (a11y)
    useEffect(() => {
        if (!showDetails || typeof window === 'undefined') return undefined;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowDetails(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showDetails]);

    const Icon = alert.icon ?? ShieldAlert;
    const isClientRequest = source.type === 'REQUEST' && Boolean(source.request);
    const pinPayload = useMemo(() => buildPinFromSecretaryAlert(source, alert), [source, alert]);
    const pinned = pinPayload ? isPinned(pinPayload.id, pinPayload.type) : false;
    const showDeepDive = extraDeepDiveText(source, source.summary) !== null;
    const deepDiveBody = useMemo(
        () => extraDeepDiveText(source, source.summary),
        [source.aiDeepDive, source.summary, source.alertReason],
    );
    const sectionLabel = alert.sectionLabel ?? 'مساحة العمل';
    const sectionIcon = alert.sectionIcon ?? '📌';
    const courtSubtitle = alert.courtSubtitle ?? alert.courtName;

    const acceptRequest = useCallback(async () => {
        if (!source.request || isProcessingRequest) return;
        setIsProcessingRequest(true);
        try {
            const ok = await ClientRequestService.updateRequestStatus(
                source.request.lawyer_id,
                source.request.id,
                RequestStatus.ACCEPTED,
            );
            if (!ok) {
                SmartToast.error('فشل قبول الطلب');
                return;
            }
            SmartToast.success('تم قبول الطلب');
            onResolved?.(source);
            onAcceptedConvertToCase?.(source);
        } finally {
            setIsProcessingRequest(false);
        }
    }, [source, onResolved, onAcceptedConvertToCase, isProcessingRequest]);

    const rejectRequest = useCallback(async () => {
        if (!source.request || isProcessingRequest) return;
        setIsProcessingRequest(true);
        try {
            const ok = await ClientRequestService.updateRequestStatus(
                source.request.lawyer_id,
                source.request.id,
                RequestStatus.REJECTED,
            );
            if (!ok) {
                SmartToast.error('فشل رفض الطلب');
                return;
            }
            SmartToast.info('تم رفض الطلب');
            onResolved?.(source);
        } finally {
            setIsProcessingRequest(false);
        }
    }, [source, onResolved, isProcessingRequest]);

    return (
        <>
            <div className="flex-[0_0_100%] min-w-0 px-0.5 relative" dir="rtl">
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => onNavigate(source)}
                    className={`w-full rounded-xl border p-3 flex flex-col gap-2 relative overflow-hidden select-none cursor-pointer bg-black/25 ${styles.border}`}
                    style={{ boxShadow: `0 0 10px ${styles.glow}` }}
                >
                    <div className="flex items-center justify-between gap-2 relative z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[9px] font-bold text-[#E6C673] truncate max-w-[52%]">
                            <span className="shrink-0">{sectionIcon}</span>
                            <span className="truncate">{sectionLabel}</span>
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                            {alert.timeLabel ? (
                                <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border border-white/5 ${styles.chip}`}
                                >
                                    {alert.timeLabel}
                                </span>
                            ) : null}
                            {pinPayload ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePin(pinPayload);
                                    }}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${
                                        pinned
                                            ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                                            : 'border-white/10 bg-white/5 text-white/60'
                                    }`}
                                    title={pinned ? 'إلغاء التثبيت' : 'تثبيت في البطاقة العامة'}
                                >
                                    <Pin size={11} className={pinned ? 'fill-current' : undefined} />
                                </button>
                            ) : null}
                            {showDeepDive ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDetails(true);
                                    }}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 text-white/70 text-[9px] font-bold shrink-0"
                                    title="تفاصيل"
                                >
                                    ؟
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDismiss(alert.id);
                                }}
                                className="w-5 h-5 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/20 shrink-0"
                                title="تجاهل"
                            >
                                <X size={10} className="text-white/50" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-start gap-2.5 relative z-10">
                        <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border text-white ${styles.iconBg}`}
                        >
                            <Icon size={18} />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 gap-1">
                            <h3 className="text-white font-bold text-[13px] leading-snug line-clamp-2">
                                {alert.title}
                            </h3>
                            {courtSubtitle ? (
                                <p className="text-[#D4AF37]/85 text-[11px] font-semibold leading-snug line-clamp-1">
                                    {courtSubtitle}
                                </p>
                            ) : null}
                            {alert.description ? (
                                <p className="text-white/55 text-[10px] leading-relaxed line-clamp-2">
                                    {alert.description}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {alert.dueFormatted ? (
                        <div className="flex flex-wrap gap-1.5 relative z-10">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-white/10 bg-white/[0.04] text-[9px] text-white/75">
                                <span className="text-white/40">🕐</span>
                                {alert.dueFormatted}
                            </span>
                        </div>
                    ) : null}

                    {isClientRequest ? (
                        <div className="w-full relative z-10 pt-1 border-t border-white/[0.06]">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void rejectRequest();
                                    }}
                                    disabled={isProcessingRequest}
                                    aria-busy={isProcessingRequest}
                                    className="flex-1 py-1.5 rounded-lg font-bold text-xs border border-red-500/35 text-red-200 bg-red-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessingRequest ? '...' : 'رفض'}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void acceptRequest();
                                    }}
                                    disabled={isProcessingRequest}
                                    aria-busy={isProcessingRequest}
                                    className="flex-1 py-1.5 rounded-lg font-bold text-xs border border-emerald-500/35 text-emerald-200 bg-emerald-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessingRequest ? '...' : 'قبول'}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </motion.div>
            </div>

            {typeof document !== 'undefined' && showDetails
                ? createPortal(
                      <AnimatePresence>
                          <motion.div
                              key="alert-details-backdrop"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                              onClick={() => setShowDetails(false)}
                              role="dialog"
                              aria-modal="true"
                              aria-labelledby={`alert-detail-title-${alert.id}`}
                          >
                              <motion.div
                                  initial={{ y: 12, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  exit={{ y: 12, opacity: 0 }}
                                  className="w-full max-w-lg max-h-[min(85vh,520px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0D0D1A]/95 p-5 shadow-2xl"
                                  onClick={(e) => e.stopPropagation()}
                                  dir="rtl"
                              >
                                  <p className="text-[10px] text-[#D4AF37]/80 font-bold mb-2">
                                      {sectionIcon} {sectionLabel}
                                  </p>
                                  <h3
                                      id={`alert-detail-title-${alert.id}`}
                                      className="text-white font-bold text-base mb-2 leading-snug"
                                  >
                                      {alert.title}
                                  </h3>
                                  {courtSubtitle ? (
                                      <p className="text-[#D4AF37]/85 text-sm font-semibold mb-2">
                                          {courtSubtitle}
                                      </p>
                                  ) : null}
                                  {alert.description ? (
                                      <p className="text-white/55 text-xs mb-2 leading-relaxed">
                                          {alert.description}
                                      </p>
                                  ) : null}
                                  {alert.dueFormatted ? (
                                      <p className="text-white/50 text-xs mb-2">الموعد: {alert.dueFormatted}</p>
                                  ) : null}
                                  {deepDiveBody ? (
                                      <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap border-t border-white/10 pt-3">
                                          {deepDiveBody}
                                      </p>
                                  ) : null}
                                  <div className="mt-4 flex gap-2">
                                      <button
                                          type="button"
                                          className="flex-1 py-2 rounded-xl border border-[#D4AF37]/35 text-white/90 bg-[#D4AF37]/10"
                                          onClick={() => {
                                              setShowDetails(false);
                                              onNavigate(source);
                                          }}
                                      >
                                          {alert.actionLabel}
                                      </button>
                                      <button
                                          type="button"
                                          className="px-4 py-2 rounded-xl border border-white/10 text-white/80"
                                          onClick={() => setShowDetails(false)}
                                      >
                                          إغلاق
                                      </button>
                                  </div>
                              </motion.div>
                          </motion.div>
                      </AnimatePresence>,
                      document.body,
                  )
                : null}
        </>
    );
});

AlertCardItem.displayName = 'AlertCardItem';

interface CarouselDotsProps {
    count: number;
    active: number;
}

export const CarouselDots: React.FC<CarouselDotsProps> = ({ count, active }) => {
    if (count <= 1) return null;
    return (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 z-20 pointer-events-none">
            {Array.from({ length: count }, (_, idx) => (
                <motion.div
                    key={idx}
                    initial={false}
                    animate={{
                        backgroundColor: idx === active ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                        width: idx === active ? 20 : 6,
                        height: 5,
                    }}
                    className="rounded-full"
                />
            ))}
        </div>
    );
};
