import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminService } from '@/app/services/AdminService';
import { ClientRequestService } from '@/app/services/ClientRequestService';
import { SmartToast } from '@/app/components/ui/SmartToast';

export function DevSecurityPanel(): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');

  const DEV_REQUESTS_SESSION_KEY = 'hami:dev:requests:v1';

  const [compromised, setCompromised] = useState(false);

  const run = useCallback(async (fn: () => Promise<void> | void) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }, []);

  if (!import.meta.env.DEV) return null;

  if (typeof document === 'undefined') return null;

  const getSessionStorage = (): Storage | null => {
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  };

  const loadRawRequests = (): unknown[] => {
    const ss = getSessionStorage();
    if (!ss) return [];
    const raw = ss.getItem(DEV_REQUESTS_SESSION_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as unknown[]) : [];
    } catch {
      return [];
    }
  };

  const saveRawRequests = (requests: unknown[]): void => {
    const ss = getSessionStorage();
    if (!ss) return;
    try {
      ss.setItem(DEV_REQUESTS_SESSION_KEY, JSON.stringify(requests));
    } catch {
      return;
    }
  };

  return createPortal(
    <div className="fixed bottom-4 left-4 z-[99999]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2 rounded-lg bg-[#0D0D1A]/95 border border-[#DAA520]/30 text-xs text-[#DAA520] shadow-xl"
      >
        {open ? 'إغلاق لوحة الأمان' : 'لوحة الأمان'}
      </button>

      {open ? (
        <div className="mt-2 w-72 rounded-2xl bg-[#0D0D1A]/95 border border-[#DAA520]/30 backdrop-blur-xl shadow-2xl p-3 space-y-2">
          <div className="text-[11px] text-white/70 flex items-center justify-between">
            <span>Honeypot</span>
            <span className={compromised ? 'text-red-400' : 'text-green-400'}>
              {compromised ? 'COMPROMISED' : 'OK'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              className="w-full px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white"
              onClick={() =>
                void run(async () => {
                  const ok = await ClientRequestService.createRequest(
                    'dev-client-001',
                    'dev-user-uuid-1',
                    'طلب تجريبي (PENDING)',
                    'تفاصيل حساسة للاختبار (سيتم تشفيرها).',
                  );
                  setLastAction(ok ? '✅ تم إنشاء طلب تجريبي' : '❌ فشل إنشاء الطلب');
                  if (ok) SmartToast.success('✅ تم إنشاء طلب تجريبي');
                  else SmartToast.error('❌ فشل إنشاء الطلب');
                })
              }
            >
              إنشاء طلب تجريبي
            </button>

            <button
              type="button"
              disabled={busy}
              className="w-full px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white"
              onClick={() =>
                void run(async () => {
                  const created = await ClientRequestService.createRequest(
                    'dev-client-001',
                    'dev-user-uuid-1',
                    'طلب تلاعب (يجب تجاهله)',
                    'تفاصيل سيتم تلاعب توقيعها.',
                  );
                  if (!created) {
                    setLastAction('❌ فشل إنشاء طلب التلاعب');
                    SmartToast.error('❌ فشل إنشاء طلب التلاعب');
                    return;
                  }

                  const raw = loadRawRequests();
                  const next = raw.map((r, idx) => {
                    if (!r || typeof r !== 'object') return r;
                    if (idx !== 0) return r;
                    const rec = r as Record<string, unknown>;
                    return { ...rec, data_signature: 'BAD_SIGNATURE_TAMPER_TEST' };
                  });
                  saveRawRequests(next);

                  const list = await ClientRequestService.getLawyerRequests('dev-user-uuid-1');
                  console.log('[DevSecurityPanel] Requests after tamper (decrypted):', list);
                  setLastAction(`✅ تم إدخال طلب متلاعب. الطلبات السليمة الآن: ${list.length}`);
                  SmartToast.success(`✅ تم إدخال طلب متلاعب. الطلبات السليمة الآن: ${list.length}`);
                })
              }
            >
              اختبار تلاعب بالبيانات - Tampering
            </button>

            <button
              type="button"
              disabled={busy}
              className="w-full px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white"
              onClick={() =>
                void run(async () => {
                  const stats = await AdminService.getSystemStatistics('admin-uuid-1');
                  console.log('[DevSecurityPanel] Admin stats:', stats);
                  setLastAction('تم جلب إحصائيات المدير (راجع Console)');
                  SmartToast.info('تم جلب إحصائيات المدير (راجع Console)');
                })
              }
            >
              تجربة الدخول كمدير
            </button>

            <button
              type="button"
              disabled={busy}
              className="w-full px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white"
              onClick={() =>
                void run(async () => {
                  try {
                    await AdminService.banUser('fake-hacker-id', 'target', 'test');
                    console.warn('[DevSecurityPanel] Intrusion simulation did not block as expected');
                  } catch (e) {
                    if (e instanceof Error && e.message === 'Unauthorized Access') {
                      console.log('[DevSecurityPanel] ✅ تم تفعيل الحماية (Unauthorized Access) بنجاح');
                      setCompromised(true);
                      setLastAction('✅ تم تفعيل الحماية بنجاح');
                      SmartToast.success('✅ تم تفعيل الحماية بنجاح (Unauthorized Access)');
                      return;
                    }
                    console.error('[DevSecurityPanel] Intrusion test error (unexpected):', e);
                    setLastAction('❌ خطأ غير متوقع (راجع Console)');
                    SmartToast.error('❌ خطأ غير متوقع - راجع Console');
                  }
                })
              }
            >
              تجربة هجوم هاكر
            </button>

            <button
              type="button"
              disabled={busy}
              className="w-full px-3 py-2 rounded-xl bg-[#1A0D0D]/60 hover:bg-[#1A0D0D]/80 border border-red-500/20 text-xs text-red-200"
              onClick={() => {
                  setCompromised(false);
                  console.log('[DevSecurityPanel] Reset completed (local state)');
                  setLastAction('✅ تم تصفير الحالة');
                  SmartToast.info('✅ تم تصفير الحالة المحلية');
                }}
              >
                تصفير النظام
            </button>
          </div>

          {lastAction ? (
            <div className="pt-2 text-[11px] text-white/60 border-t border-white/10">{lastAction}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  ,
    document.body,
  );
}
