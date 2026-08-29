import React, { useCallback, useRef, useState } from 'react';
import { HqFold } from '@/app/components/admin/HqFold';
import { HqGhostButton, HqStateBlock } from '@/app/components/admin/hqChrome';
import { formatHqDateTime, formatHqRemaining } from '@/app/components/admin/hqFormat';
import { useHqPanelLoad } from '@/app/components/admin/useHqPanelLoad';
import { DeviceTrustService } from '@/app/domain/admin/deviceTrust';
import { isHqAbortError, stripHqControlChars } from '@/app/domain/admin/hqSafeText';
import { peekPrimedHeadquartersDevices } from '@/app/services/admin/hqDevSessionPrime';
import { hqMutatingFetch } from '@/app/services/admin/hqSecureFetch';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { SmartToast } from '@/app/components/ui/SmartToast';

type DeviceRow = {
    id: string;
    hint: string;
    label: string | null;
    trustedAt: string;
    expiresAt: string;
    lastSeenAt: string;
    current: boolean;
    expired: boolean;
};

function deviceTitle(device: DeviceRow): string {
    if (device.current) return 'هذا الجهاز — المتصفح الحالي';
    if (device.label?.trim()) return device.label.trim();
    return 'جهاز آخر لنفس حساب المقر';
}

function DeviceFact({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
    return (
        <div className="flex min-h-9 items-baseline justify-between gap-3 border-b border-white/5 py-2 last:border-b-0">
            <span className="shrink-0 text-xs text-white/45">{label}</span>
            <span className="text-end text-xs font-semibold text-white/85" dir={ltr ? 'ltr' : 'rtl'}>
                {value}
            </span>
        </div>
    );
}

function sanitizeDeviceRows(raw: unknown): DeviceRow[] {
    if (!Array.isArray(raw)) return [];
    const out: DeviceRow[] = [];
    for (const row of raw) {
        if (!row || typeof row !== 'object') continue;
        const rec = row as Partial<DeviceRow>;
        const id = stripHqControlChars(rec.id, 80);
        if (!id) continue;
        out.push({
            id,
            hint: stripHqControlChars(rec.hint, 32),
            label: rec.label == null ? null : stripHqControlChars(rec.label, 80) || null,
            trustedAt: String(rec.trustedAt ?? '').slice(0, 40),
            expiresAt: String(rec.expiresAt ?? '').slice(0, 40),
            lastSeenAt: String(rec.lastSeenAt ?? '').slice(0, 40),
            current: Boolean(rec.current),
            expired: Boolean(rec.expired),
        });
        if (out.length >= 40) break;
    }
    return out;
}

export function HqTrustedDevicesPanel({ gated = false }: { gated?: boolean }) {
    const primedRef = useRef(peekPrimedHeadquartersDevices());
    const primed = primedRef.current;
    const [devices, setDevices] = useState<DeviceRow[]>(() => sanitizeDeviceRows(primed ?? []));
    const [loadError, setLoadError] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const work = useCallback(async (signal: AbortSignal) => {
        if (gated) {
            setLoadError(false);
            return;
        }
        setLoadError(false);
        try {
            const data = await SecureAPIClient.fetchSecure<{ ok?: boolean; devices?: unknown }>(
                '/api/admin/devices',
                { method: 'GET', signal },
            );
            if (signal.aborted) return;
            if (!data?.ok) {
                setLoadError(true);
                return;
            }
            setDevices(sanitizeDeviceRows(data.devices));
        } catch (error) {
            if (isHqAbortError(error, signal)) return;
            setLoadError(true);
        }
    }, [gated]);

    const { loading, failed, reload } = useHqPanelLoad(work, {
        alreadySettled: primed !== null || gated,
        skipFirstWork: primed !== null || gated,
    });

    const onRevoke = async (device: DeviceRow) => {
        setBusyId(device.id);
        try {
            const result = await hqMutatingFetch<{ ok?: boolean; error?: string }>(
                '/api/admin/devices',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'revoke', deviceId: device.id }),
                },
            );
            if (!result?.ok) {
                SmartToast.error(result?.error || 'تعذّر سحب الثقة');
                return;
            }
            if (device.current) {
                DeviceTrustService.revokeDeviceTrust();
            }
            setDevices((prev) => prev.filter((row) => row.id !== device.id));
            SmartToast.success(
                device.current
                    ? 'سُحبت ثقة هذا الجهاز — سيُطلب التحقّق في الدخول التالي للمقر'
                    : 'سُحبت ثقة الجهاز',
            );
        } catch {
            SmartToast.error('تعذّر سحب الثقة');
        } finally {
            setBusyId(null);
        }
    };

    const liveCount = devices.filter((d) => !d.expired).length;
    const failedLoad = loadError || failed;
    const showLoading = loading && devices.length === 0;
    const showError = failedLoad && devices.length === 0;
    const summary = showLoading
        ? 'جاري التحميل'
        : showError
          ? 'تعذّر التحميل'
          : failedLoad
            ? 'تعذّر التحديث'
            : devices.length === 0
              ? 'لا أجهزة موثّقة'
              : `${devices.length} جهاز · ${liveCount} موثّق`;

    return (
        <HqFold
            id="devices"
            kicker="التشغيل"
            title="الأجهزة الموثّقة"
            summary={summary}
            alert={failedLoad}
            testId="hq-stats-devices"
            action={<HqGhostButton onClick={() => void reload()}>تحديث</HqGhostButton>}
        >
            {showLoading ? (
                <HqStateBlock kind="loading" title="جاري تحميل الأجهزة..." />
            ) : showError ? (
                <HqStateBlock
                    kind="error"
                    title="تعذّر تحميل الأجهزة الموثّقة"
                    action={
                        <HqGhostButton className="mt-3" onClick={() => void reload()}>
                            إعادة المحاولة
                        </HqGhostButton>
                    }
                />
            ) : devices.length === 0 ? (
                <HqStateBlock
                    kind="empty"
                    title="لا أجهزة موثّقة حالياً."
                    detail="بعد نجاح التحقّق يُحفظ هذا المتصفح هنا حتى انتهاء المدة أو سحب الثقة."
                />
            ) : (
                <div className="space-y-3">
                    {devices.map((device) => (
                        <div
                            key={device.id}
                            className="hq-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                            data-testid={device.current ? 'hq-trusted-device-current' : `hq-trusted-device-${device.id}`}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-bold text-white">{deviceTitle(device)}</p>
                                    <span
                                        className={
                                            device.expired
                                                ? 'rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-400'
                                                : device.current
                                                  ? 'rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400'
                                                  : 'rounded-full border border-[#E6C673]/35 bg-[#E6C673]/10 px-2 py-0.5 text-[11px] font-bold text-[#E6C673]'
                                        }
                                    >
                                        {device.expired ? 'منتهية' : device.current ? 'الحالي' : 'موثّق'}
                                    </span>
                                </div>
                                <div className="mt-2">
                                    <DeviceFact label="وُثّق في" value={formatHqDateTime(device.trustedAt)} />
                                    <DeviceFact label="آخر دخول للمقر" value={formatHqDateTime(device.lastSeenAt)} />
                                    <DeviceFact
                                        label="تنتهي الثقة"
                                        value={`${formatHqDateTime(device.expiresAt)} · ${formatHqRemaining(device.expiresAt)}`}
                                    />
                                    <DeviceFact
                                        label="رمز تفريق مختصر"
                                        value={device.hint || '—'}
                                        ltr
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={busyId === device.id}
                                onClick={() => void onRevoke(device)}
                                className="min-h-11 shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-4 text-sm font-bold text-red-400 disabled:opacity-50"
                            >
                                سحب الثقة
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </HqFold>
    );
}
