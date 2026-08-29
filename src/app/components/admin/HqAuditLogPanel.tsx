import React, { useCallback, useRef, useState } from 'react';
import { HqFold } from '@/app/components/admin/HqFold';
import { HqGhostButton, HqStateBlock } from '@/app/components/admin/hqChrome';
import { formatHqDateTime } from '@/app/components/admin/hqFormat';
import { useHqLiveReload } from '@/app/components/admin/useHqLiveReload';
import { useHqPanelLoad, hqPanelFailDetail } from '@/app/components/admin/useHqPanelLoad';
import { hqAuditActionLabel, hqAuditFactsCaption } from '@/app/domain/admin/hqAuditLabels';
import { isHqAbortError, stripHqControlChars } from '@/app/domain/admin/hqSafeText';
import { peekPrimedHeadquartersAudit } from '@/app/services/admin/hqDevSessionPrime';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';

type AuditRow = {
    id: string;
    action: string;
    actorId: string;
    targetId: string | null;
    createdAt: string;
    facts: string;
};


function sanitizeAuditRows(raw: unknown): AuditRow[] {
    if (!Array.isArray(raw)) return [];
    const out: AuditRow[] = [];
    for (const row of raw) {
        if (!row || typeof row !== 'object') continue;
        const rec = row as Partial<AuditRow> & { details?: unknown };
        const id = stripHqControlChars(rec.id, 80);
        const action = stripHqControlChars(rec.action, 80);
        if (!id || !action) continue;
        out.push({
            id,
            action,
            actorId: stripHqControlChars(rec.actorId, 80),
            targetId: rec.targetId == null ? null : stripHqControlChars(rec.targetId, 80) || null,
            createdAt: String(rec.createdAt ?? '').slice(0, 40),
            facts: hqAuditFactsCaption(rec.details),
        });
        if (out.length >= 80) break;
    }
    return out;
}

export function HqAuditLogPanel({ gated = false }: { gated?: boolean }) {
    const primedRef = useRef(peekPrimedHeadquartersAudit());
    const primed = primedRef.current;
    const [entries, setEntries] = useState<AuditRow[]>(() => sanitizeAuditRows(primed ?? []));
    const [loadError, setLoadError] = useState(false);

    const work = useCallback(async (signal: AbortSignal) => {
        if (gated) {
            setLoadError(false);
            return;
        }
        setLoadError(false);
        try {
            const data = await SecureAPIClient.fetchSecure<{ ok?: boolean; entries?: unknown }>(
                '/api/admin/audit',
                { method: 'GET', signal },
            );
            if (signal.aborted) return;
            if (!data?.ok) {
                setLoadError(true);
                return;
            }
            setEntries(sanitizeAuditRows(data.entries));
        } catch (error) {
            if (isHqAbortError(error, signal)) return;
            setLoadError(true);
        }
    }, [gated]);

    const { loading, failed, failKind, reload } = useHqPanelLoad(work, {
        alreadySettled: primed !== null || gated,
        skipFirstWork: primed !== null || gated,
    });
    useHqLiveReload(reload);
    const failedLoad = loadError || failed;
    const showLoading = loading && entries.length === 0;
    const showError = failedLoad && entries.length === 0;
    const summary = showLoading
        ? 'جاري التحميل'
        : showError
          ? 'تعذّر التحميل'
          : failedLoad
            ? 'تعذّر التحديث'
            : entries.length === 0
              ? 'لا عمليات بعد'
              : `${entries.length} عملية`;

    return (
        <HqFold
            id="audit"
            kicker="التشغيل"
            title="سجل العمليات"
            summary={summary}
            alert={failedLoad}
            testId="hq-stats-audit"
            action={<HqGhostButton onClick={() => void reload()}>تحديث</HqGhostButton>}
        >
            {showLoading ? (
                <HqStateBlock kind="loading" title="جاري تحميل السجل..." />
            ) : showError ? (
                <HqStateBlock
                    kind="error"
                    title="تعذّر تحميل سجل العمليات"
                    detail={hqPanelFailDetail(failKind)}
                    action={
                        <HqGhostButton className="mt-3" onClick={() => void reload()}>
                            إعادة المحاولة
                        </HqGhostButton>
                    }
                />
            ) : entries.length === 0 ? (
                <HqStateBlock
                    kind="empty"
                    title="لا عمليات مسجّلة بعد."
                    detail="إن نفّذت إجراء مقر ولم يظهر هنا فكتابة السجل لم تتم."
                />
            ) : (
                <div className="hq-panel overflow-hidden">
                    <ul className="divide-y divide-white/5">
                        {entries.map((row) => (
                            <li key={row.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white">{hqAuditActionLabel(row.action)}</p>
                                    <p className="truncate text-[11px] text-white/40" dir="ltr">
                                        {row.actorId}
                                        {row.targetId && row.targetId !== row.actorId ? ` → ${row.targetId}` : ''}
                                    </p>
                                    {row.facts ? (
                                        <p className="truncate text-[11px] text-white/35">{row.facts}</p>
                                    ) : null}
                                </div>
                                <p className="shrink-0 text-xs tabular-nums text-white/45">
                                    {formatHqDateTime(row.createdAt)}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </HqFold>
    );
}
