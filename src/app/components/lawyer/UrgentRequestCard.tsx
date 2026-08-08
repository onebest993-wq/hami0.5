import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, Hourglass, PenSquare, Scale, Sparkles, UserCircle, X } from '@/app/components/ui/lucideIcons';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ClientRequestService } from '@/app/services/ClientRequestService';
import { RequestStatus } from '@/app/types/admin-types';

type UrgencyTone = 'critical' | 'new' | 'normal';

function parseDate(value?: string): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

function inferTone(alert: SecretaryAlert): UrgencyTone {
  if (alert.type === 'REQUEST' && alert.request?.ai_metadata?.urgency === 'CRITICAL') return 'critical';
  const due = parseDate(alert.dueAt);
  if (due !== null) {
    const h = (due - Date.now()) / (60 * 60 * 1000);
    if (h <= 6) return 'critical';
  }
  if (alert.type === 'REQUEST') return 'new';
  return 'normal';
}

function toneStyles(tone: UrgencyTone): { border: string; glow: string; chip: string; iconBg: string } {
  if (tone === 'critical') {
    return { border: 'border-red-500/40', glow: 'rgba(239,68,68,0.45)', chip: 'bg-red-900/45 text-red-200', iconBg: 'bg-red-500/10 border-red-500/25' };
  }
  if (tone === 'new') {
    return { border: 'border-amber-500/35', glow: 'rgba(245,158,11,0.35)', chip: 'bg-amber-900/35 text-amber-200', iconBg: 'bg-amber-500/10 border-amber-500/20' };
  }
  return { border: 'border-sky-500/25', glow: 'rgba(56,189,248,0.22)', chip: 'bg-sky-900/35 text-sky-200', iconBg: 'bg-sky-500/10 border-sky-500/20' };
}

function timeLabel(alert: SecretaryAlert): string {
  const due = parseDate(alert.dueAt);
  if (due === null) return 'اليوم';
  const diff = due - Date.now();
  if (diff <= 0) return 'الآن';
  const mins = Math.floor(diff / 60000);
  const h = Math.floor(mins / 60);
  if (h < 1) return `باقي ${mins} دقيقة`;
  return `باقي ${h} ساعة`;
}

export function UrgentRequestCard(props: {
  alert: SecretaryAlert;
  onNavigate: (alert: SecretaryAlert) => void;
  onAcceptedConvertToCase: (alert: SecretaryAlert) => void;
}): React.JSX.Element {
  const { alert } = props;
  const tone = useMemo(() => inferTone(alert), [alert]);
  const styles = useMemo(() => toneStyles(tone), [tone]);
  const [showDeepDive, setShowDeepDive] = useState(false);

  const pressTimerRef = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const acceptOpacity = useMemo(() => Math.max(0, Math.min(1, dragX / 110)), [dragX]);
  const rejectOpacity = useMemo(() => Math.max(0, Math.min(1, -dragX / 110)), [dragX]);

  const onPointerDown = useCallback(() => {
    if (pressTimerRef.current !== null) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = window.setTimeout(() => setShowDeepDive(true), 420);
  }, []);

  const onPointerUp = useCallback(() => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const accept = useCallback(async () => {
    if (!alert.request) return;
    const ok = await ClientRequestService.updateRequestStatus(alert.request.lawyer_id, alert.request.id, RequestStatus.ACCEPTED);
    if (!ok) return SmartToast.error('فشل قبول الطلب');
    SmartToast.success('✅ تم قبول الطلب');
    props.onAcceptedConvertToCase(alert);
  }, [alert, props]);

  const reject = useCallback(async () => {
    if (!alert.request) return;
    const ok = await ClientRequestService.updateRequestStatus(alert.request.lawyer_id, alert.request.id, RequestStatus.REJECTED);
    if (!ok) return SmartToast.error('فشل رفض الطلب');
    SmartToast.info('تم رفض الطلب مع اعتذار آلي (محاكاة)');
  }, [alert]);

  const icon = useMemo(() => {
    if (alert.type === 'HEARING') return Scale;
    if (alert.type === 'NOTE') return PenSquare;
    if (alert.type === 'TASK') return Hourglass;
    return UserCircle;
  }, [alert.type]);
  const Icon = icon;

  const cardBase =
    'min-w-[360px] w-[360px] shrink-0 snap-start rounded-2xl p-4 flex flex-col gap-2 shadow-xl relative overflow-hidden select-none border backdrop-blur-md bg-slate-900/80';
  const canSwipe = alert.type === 'REQUEST' && Boolean(alert.request);

  return (
    <>
      <div className="relative shrink-0 snap-start">
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <motion.div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.08) 0%, rgba(245,158,11,0.06) 50%, rgba(56,189,248,0.06) 100%)', opacity: 0.35 }} />
          {canSwipe ? (
            <motion.div className="absolute inset-0 flex items-center justify-between px-6">
              <motion.div style={{ opacity: rejectOpacity }} className="flex items-center gap-2 text-red-200/90"><X size={18} /><span className="text-xs font-bold">رفض</span></motion.div>
              <motion.div style={{ opacity: acceptOpacity }} className="flex items-center gap-2 text-emerald-200/90"><Scale size={18} /><span className="text-xs font-bold">قبول</span></motion.div>
            </motion.div>
          ) : null}
        </div>

        <motion.div
          drag={canSwipe ? 'x' : false}
          dragElastic={0.18}
          dragConstraints={{ left: -120, right: 120 }}
          onDrag={(_, info) => {
            if (!canSwipe) return;
            dragXRef.current = info.offset.x;
            if (rafRef.current !== null) return;
            rafRef.current = window.requestAnimationFrame(() => {
              rafRef.current = null;
              setDragX(dragXRef.current);
            });
          }}
          onDragStart={() => setDragX(0)}
          onDragEnd={(_, info) => {
            setDragX(0);
            if (!canSwipe) return;
            if (info.offset.x > 90) return void accept();
            if (info.offset.x < -90) return void reject();
          }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          onClick={() => props.onNavigate(alert)}
          className={`${cardBase} ${styles.border} cursor-pointer`}
          animate={{ boxShadow: [`0 0 0px ${styles.glow}`, `0 0 18px ${styles.glow}`, `0 0 0px ${styles.glow}`] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-[55px] opacity-25 bg-amber-500" />
          <div className="flex justify-between items-center w-full relative z-10">
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm border border-white/5 ${styles.chip}`}>{timeLabel(alert)}</div>
            <div className="inline-flex items-center gap-2 text-slate-400 text-[10px] font-medium tracking-wide">
              <span className="text-slate-500">{alert.clientName ?? 'سكرتير ذكي'}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeepDive(true);
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 text-white/80 hover:text-white"
              >
                <Eye size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 relative z-10">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-[0_0_15px_rgba(255,215,0,0.08)] text-white ${styles.iconBg}`}>
              <Icon size={20} className="drop-shadow-[0_0_8px_currentColor]" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-white font-bold text-sm leading-tight line-clamp-1">{alert.title}</h3>
              <p className="text-white/70 text-[11px] leading-relaxed line-clamp-1">{alert.summary}</p>
              {alert.suggestedAction ? (
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[#FFD700] w-fit">
                  <Sparkles size={11} />
                  <span>توصية الذكاء الاصطناعي:</span>
                  <span className="text-white/90">{alert.suggestedAction}</span>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showDeepDive ? (
          <motion.div
            key="deep-dive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDeepDive(false)}
          >
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl border border-[#DAA520]/25 bg-[#0D0D1A]/95 shadow-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[#FFD700] text-sm font-bold mb-2">✨ تحليل السكرتير الذكي</div>
              <div className="text-white text-base font-bold mb-2">{alert.title}</div>
              <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{alert.aiDeepDive}</div>
              <div className="mt-4 flex justify-end">
                <button type="button" className="px-4 py-2 rounded-xl border border-white/10 text-white/80 hover:text-white hover:bg-white/5" onClick={() => setShowDeepDive(false)}>
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
