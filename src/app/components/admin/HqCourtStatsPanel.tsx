import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    HqGhostButton,
    HqMetric,
    HqPulseCell,
    HqStateBlock,
} from '@/app/components/admin/hqChrome';
import { formatHqDateTime } from '@/app/components/admin/hqFormat';
import type { HqLiveOverview } from '@/app/components/admin/hqLiveOverview';
import { HqStatsLiveSections } from '@/app/components/admin/HqStatsLiveSections';
import {
    HqStatsSection,
    hqCourtsSummary,
    hqHealthLabel,
    hqHealthSummary,
    hqSystemLabel,
    hqSystemTone,
} from '@/app/components/admin/hqStatsChrome';
import { HqMailHealthStrip, type HqMailHealth } from '@/app/components/admin/HqMailHealthStrip';
import { dispatchHqStatusRefresh } from '@/app/components/admin/hqStatusEvents';
import type { HqJumpHandler } from '@/app/components/admin/hqJump';
import { useHqPanelLoad } from '@/app/components/admin/useHqPanelLoad';
import { sanitizeHqCourtRows, type HqCourtStat } from '@/app/domain/admin/hqCourtStats';
import { isHqAbortError } from '@/app/domain/admin/hqSafeText';
import { peekPrimedHeadquartersCourts } from '@/app/services/admin/hqDevSessionPrime';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { cn } from '@/app/components/ui/utils';

function HqCourtDistribution({ courts }: { courts: HqCourtStat[] }) {
    const lawsuitSum = useMemo(() => courts.reduce((sum, row) => sum + row.lawsuits, 0), [courts]);
    const transactionSum = useMemo(
        () => courts.reduce((sum, row) => sum + row.transactions, 0),
        [courts],
    );
    return (
        <HqStatsSection
            foldId="courts"
            title="توزيع المحاكم"
            summary={hqCourtsSummary(courts.length, lawsuitSum)}
            testId="hq-stats-courts"
        >
            <div className="hq-ops-grid hq-ops-grid-3">
                <HqMetric label="محاكم ظهرت" value={courts.length} hint="صفوف وصلت من التجميع السحابي" />
                <HqMetric label="مجموع الدعاوى" value={lawsuitSum} hint="كل المحاكم الظاهرة" />
                <HqMetric label="مجموع المعاملات" value={transactionSum} hint="معاملات التنفيذ الرسمية" />
            </div>
            <div className="hq-ops-grid hq-ops-grid-3">
                {courts.map((stats) => (
                    <div key={stats.court} className="hq-panel hq-ops-court">
                        <h3 className="hq-ops-court-name">{stats.court}</h3>
                        <div className="hq-ops-court-row">
                            <span>دعاوى قضائية</span>
                            <span>{stats.lawsuits}</span>
                        </div>
                        <div className="hq-ops-court-row">
                            <span>معاملات رسمية</span>
                            <span>{stats.transactions}</span>
                        </div>
                    </div>
                ))}
            </div>
        </HqStatsSection>
    );
}

/**
 * تبويب إحصائيات المقر — نبض المنصة من /api/admin/status + تجميع المحاكم من /api/admin/stats إن وُجد.
 */
export function HqCourtStatsPanel({
    onJump,
    liveOverview = null,
    mail = null,
    checking = false,
    gated = false,
}: {
    onJump?: HqJumpHandler;
    liveOverview?: HqLiveOverview | null;
    mail?: HqMailHealth | null;
    checking?: boolean;
    gated?: boolean;
}) {
    const primedCourtsRef = useRef(peekPrimedHeadquartersCourts());
    const primedCourts = primedCourtsRef.current;
    const [courts, setCourts] = useState<HqCourtStat[]>(() => primedCourts ?? []);
    const [loadError, setLoadError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const freshRef = useRef(false);
    const refreshGuardRef = useRef(false);
    const sessionGated = Boolean(liveOverview?.sessionRequired || gated);
    const skipFirstWork = primedCourts !== null && !sessionGated;

    const work = useCallback(async (signal: AbortSignal) => {
        if (sessionGated) {
            setCourts([]);
            setLoadError(false);
            return;
        }
        const fresh = freshRef.current;
        freshRef.current = false;
        setLoadError(false);
        try {
            const path = fresh ? '/api/admin/stats?fresh=1' : '/api/admin/stats';
            const data = await SecureAPIClient.fetchSecure<{
                ok?: boolean;
                courts?: unknown;
            }>(path, { method: 'GET', signal });
            if (signal.aborted) return;
            if (!data?.ok) {
                setLoadError(true);
                return;
            }
            setCourts(sanitizeHqCourtRows(data.courts));
        } catch (error) {
            if (isHqAbortError(error, signal)) return;
            setLoadError(true);
        }
    }, [sessionGated]);

    const { failed, reload } = useHqPanelLoad(work, {
        alreadySettled: primedCourts !== null,
        skipFirstWork,
    });
    const courtsFailed = Boolean((loadError || failed) && courts.length === 0);

    const refreshAll = useCallback(() => {
        if (refreshGuardRef.current) return;
        refreshGuardRef.current = true;
        setRefreshing(true);
        freshRef.current = true;
        dispatchHqStatusRefresh();
        void reload().finally(() => {
            refreshGuardRef.current = false;
            setRefreshing(false);
        });
    }, [reload]);

    const numbersUnavailable = Boolean(
        liveOverview &&
            (liveOverview.sessionRequired ||
                (!liveOverview.db && !liveOverview.stale) ||
                (liveOverview.system === 'down' && !liveOverview.fetchedAt)),
    );
    const pulseTone = sessionGated
        ? 'warn'
        : liveOverview
          ? hqSystemTone(liveOverview.system)
          : checking
            ? 'warn'
            : 'danger';
    const pulseLabel = sessionGated
        ? 'بلا جلسة'
        : liveOverview
          ? hqSystemLabel(liveOverview.system)
          : checking
            ? 'جاري التحقق'
            : 'منقطع';

    return (
        <div className="hq-ops" data-testid="hq-stats-monitor">
            <div className="hq-ops-head">
                <div className="min-w-0">
                    <p className="hq-kicker">المراقبة</p>
                    <h2 className="hq-title">الإحصائيات الحية</h2>
                </div>
                <div className="hq-ops-meta">
                    <span className={cn('hq-ops-pill', `hq-ops-pill-${pulseTone}`)}>{pulseLabel}</span>
                    {liveOverview?.fetchedAt ? (
                        <p className="hq-ops-stamp">آخر تحديث: {formatHqDateTime(liveOverview.fetchedAt)}</p>
                    ) : null}
                    <HqGhostButton onClick={refreshAll} aria-busy={refreshing}>
                        تحديث
                    </HqGhostButton>
                </div>
            </div>

            {liveOverview?.stale ? (
                <p className="hq-ops-note" role="status">
                    تعذّر التحديث — تُعرض آخر أرقام ناجحة.
                </p>
            ) : null}

            <div className="hq-ops-pulse" data-testid="hq-stats-health">
                {liveOverview ? (
                    <>
                        {sessionGated ? (
                            <p className="hq-ops-caption">{hqHealthSummary(liveOverview)}</p>
                        ) : null}
                        <HqPulseCell
                            label="حالة النظام"
                            value={sessionGated ? 'بلا جلسة' : hqSystemLabel(liveOverview.system)}
                            detail={
                                sessionGated
                                    ? 'تحتاج جلسة مدير وجهاز موثّق'
                                    : liveOverview.system === 'connected'
                                      ? 'القاعدة ومخزن التوثيق متصلان'
                                      : liveOverview.system === 'degraded'
                                        ? 'القاعدة تعمل ومخزن التوثيق متقطع'
                                        : 'تعذّر قراءة نبض المنصّة'
                            }
                            tone={sessionGated ? 'warn' : hqSystemTone(liveOverview.system)}
                        />
                        <HqPulseCell
                            label="قاعدة البيانات"
                            value={sessionGated ? 'لم تُفحص' : hqHealthLabel(liveOverview.db, 'تعمل', 'متوقفة')}
                            detail={sessionGated ? 'لم يُطلب العدّ بعد' : 'مصدر الحسابات والمنتدى'}
                            tone={sessionGated ? 'warn' : liveOverview.db ? 'ok' : 'danger'}
                        />
                        <HqPulseCell
                            label="مخزن التوثيق"
                            value={sessionGated ? 'لم يُفحص' : hqHealthLabel(liveOverview.kvOk, 'يعمل', 'متوقف')}
                            detail={sessionGated ? 'لم يُمسح طابور المحامين' : 'طلبات اعتماد المحامين'}
                            tone={sessionGated ? 'warn' : liveOverview.kvOk ? 'ok' : 'danger'}
                        />
                    </>
                ) : (
                    <>
                        <HqPulseCell
                            label="حالة النظام"
                            value={checking ? 'جاري التحقق' : 'منقطع'}
                            detail="بانتظار أول نبض من المقر"
                            tone="warn"
                        />
                        <HqPulseCell label="قاعدة البيانات" value="لم تُفحص" detail="—" tone="warn" />
                        <HqPulseCell label="مخزن التوثيق" value="لم يُفحص" detail="—" tone="warn" />
                    </>
                )}
                <HqMailHealthStrip
                    variant="cell"
                    mail={mail}
                    checking={checking}
                    gated={sessionGated}
                />
            </div>

            {liveOverview ? (
                numbersUnavailable ? (
                    <HqStateBlock
                        kind="error"
                        title={sessionGated ? 'لا توجد جلسة خادم لفحص الصحة' : 'تعذّر تحميل الإحصائيات'}
                        detail={
                            sessionGated
                                ? 'القاعدة ليست متوقفة من هذا العرض. أعد الدخول بجلسة مدير وجهاز موثّق لرؤية الأرقام الحية.'
                                : 'لم تصل أرقام من المقر. أعد المحاولة دون اعتماد الأصفار كواقع للمنصّة.'
                        }
                        action={
                            <HqGhostButton className="mt-3" onClick={refreshAll} aria-busy={refreshing}>
                                إعادة المحاولة
                            </HqGhostButton>
                        }
                    />
                ) : (
                    <HqStatsLiveSections live={liveOverview} onJump={onJump} />
                )
            ) : (
                <HqStateBlock kind="loading" title="جاري التحميل..." />
            )}

            {courtsFailed ? (
                <HqStateBlock
                    kind="error"
                    title="تعذّر تحميل توزيع المحاكم"
                    action={
                        <HqGhostButton className="mt-3" onClick={refreshAll} aria-busy={refreshing}>
                            إعادة المحاولة
                        </HqGhostButton>
                    }
                />
            ) : courts.length > 0 ? (
                <HqCourtDistribution courts={courts} />
            ) : null}
        </div>
    );
}
