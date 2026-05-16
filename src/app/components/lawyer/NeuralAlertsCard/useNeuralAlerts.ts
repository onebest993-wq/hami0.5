import { useMemo, useCallback, useState, useEffect } from 'react';
import { AlertTriangle, Clock, Scale } from 'lucide-react';
import { useCaseStore } from '@/app/stores/caseStore';
import type { LegalCase } from '@/app/stores/caseStore';
import { PRIORITY_ORDER, safeString, safeDate, getDismissedIds, addDismissedId } from './constants';
import type { SmartAlert } from './types';

export const useNeuralAlerts = () => {
    let cases: LegalCase[] = [];
    try {
        cases = useCaseStore((s) => s.cases);
    } catch {
        cases = [];
    }

    const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds);

    useEffect(() => {
        setDismissedIds(getDismissedIds());
    }, []);

    const dismiss = useCallback((id: string) => {
        addDismissedId(id);
        setDismissedIds((prev) => [...prev, id]);
    }, []);

    const alerts = useMemo(() => {
        try {
            const generatedAlerts: SmartAlert[] = [];
            const activeCases = cases.filter((c) => c.status === 'active');
            const now = Date.now();

            activeCases.forEach((c) => {
                const safeCaseNo = safeString(c.caseNo, c.title || 'دعوى');
                const safeClientName = safeString(c.clientName, 'موكل');
                const safeCourt = safeString(c.court, 'المحكمة');
                const safeCaseId = c.id || '';

                const deadlines = (c.deadlines || []).filter((d) => !d.isCompleted);
                const hearings = (c.timeline || []).filter((h) => {
                    const hTime = safeDate(h.date);
                    return hTime > 0;
                });
                const linkedDocs = (c.linkedDocuments || []).filter((d) => !d.isDeleted);

                for (const d of deadlines) {
                    const deadlineMs = safeDate(d.date);
                    if (!deadlineMs) continue;
                    const hoursOverdue = (now - deadlineMs) / (1000 * 60 * 60);
                    if (hoursOverdue > 0 && hoursOverdue < 168) {
                        const hoursLate = Math.round(hoursOverdue);
                        generatedAlerts.push({
                            id: `overdue-${d.id}`,
                            title: `⚠️ موعد نهائي منتهي: ${d.title}`,
                            description: `متأخر بـ ${hoursLate} ساعة — ${safeCaseNo}`,
                            priority: 'critical',
                            actionType: 'openDrafter',
                            actionLabel: 'فتح المسودة',
                            payload: { caseId: safeCaseId },
                            timestamp: deadlineMs,
                            clientName: safeClientName,
                            caseNo: c.caseNo,
                            timeLabel: `متأخر ${hoursLate} ساعة`,
                            colorTheme: 'amber',
                            icon: AlertTriangle,
                        });
                    }
                }

                for (const d of deadlines) {
                    const deadlineMs = safeDate(d.date);
                    if (!deadlineMs) continue;
                    const hoursLeft = (deadlineMs - now) / (1000 * 60 * 60);
                    if (hoursLeft > 0 && hoursLeft < 48) {
                        const roundedHours = Math.round(hoursLeft);
                        const isCritical = hoursLeft < 6;
                        generatedAlerts.push({
                            id: `deadline-${d.id}`,
                            title: `موعد نهائي: ${d.title}`,
                            description: `باقي ${roundedHours} ساعة لانتهاء المدة — ${safeCaseNo}`,
                            priority: isCritical ? 'critical' : hoursLeft < 24 ? 'high' : 'medium',
                            actionType: 'openDrafter',
                            actionLabel: 'فتح المسودة',
                            payload: { caseId: safeCaseId },
                            timestamp: deadlineMs,
                            clientName: safeClientName,
                            caseNo: c.caseNo,
                            timeLabel: `باقي ${roundedHours} ساعة`,
                            colorTheme: isCritical ? 'amber' : 'blue',
                            icon: Clock,
                        });
                    }
                }

                for (const h of hearings) {
                    const hTime = safeDate(h.date);
                    if (!hTime) continue;
                    const hoursLeft = (hTime - now) / (1000 * 60 * 60);
                    if (hoursLeft < 48) {
                        const isToday = new Date(hTime).toDateString() === new Date(now).toDateString();
                        const isTomorrow = new Date(hTime).toDateString() === new Date(now + 86400000).toDateString();
                        const timeLabel = isToday ? 'اليوم' : isTomorrow ? 'غداً' : `باقي ${Math.round(hoursLeft)} ساعة`;

                        generatedAlerts.push({
                            id: `hearing-${h.id}`,
                            title: isToday ? `🔴 جلسة اليوم: ${h.title}` : `جلسة: ${h.title}`,
                            description: `${safeCourt} — ${safeCaseNo}`,
                            priority: isToday ? 'critical' : 'high',
                            actionType: 'openChecklist',
                            actionLabel: 'فتح التذكرة',
                            payload: { caseId: safeCaseId },
                            timestamp: hTime,
                            clientName: safeClientName,
                            caseNo: c.caseNo,
                            timeLabel,
                            colorTheme: isToday ? 'amber' : 'blue',
                            icon: Scale,
                        });
                    }
                }

                if (linkedDocs.length === 0) {
                    generatedAlerts.push({
                        id: `missing-docs-${c.id}`,
                        title: 'مستندات ناقصة',
                        description: `لا توجد مستندات مرفوعة في دعوى ${safeCaseNo}`,
                        priority: 'medium',
                        actionType: 'openScanner',
                        actionLabel: 'فتح الماسح',
                        payload: { caseId: safeCaseId },
                        timestamp: now,
                        clientName: safeClientName,
                        caseNo: c.caseNo,
                        timeLabel: 'مستندات ناقصة',
                        colorTheme: 'amber',
                        icon: AlertTriangle,
                    });
                }
            });

            generatedAlerts.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99));

            return generatedAlerts.filter((a) => !dismissedIds.includes(a.id));
        } catch {
            return [];
        }
    }, [cases, dismissedIds]);

    return { alerts, dismiss };
};
