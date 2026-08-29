import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

import { daysFromTodayYmd, localTodayYmd } from '@/app/services/alertFutureGate';



/** بادئة حقن مهام الميدان — محليًا لكسر سحب fieldTaskAlerts إلى مسارات خفيفة */

const FIELD_TASK_ALERT_ID_PREFIX = 'field-task:';



function isInjectedFieldTaskAlert(

    alert: Pick<SecretaryAlert, 'id' | 'fieldTaskInjected' | 'calendarSource'>,

): boolean {

    if (alert.fieldTaskInjected) return true;

    const id = alert.id ?? '';

    if (id.startsWith(FIELD_TASK_ALERT_ID_PREFIX)) return true;

    return alert.calendarSource?.module === 'field_day_task';

}



function dueMs(alert: SecretaryAlert): number | null {

    if (!alert.dueAt) return null;

    const t = Date.parse(alert.dueAt);

    return Number.isNaN(t) ? null : t;

}



const HOUR_MS = 60 * 60 * 1000;

/** عاجل: اليوم وغداً */

const URGENT_MAX_HOURS = 48;

/** قادم: ما بعد غد ولمدة 3 أيام (حتى اليوم +4) */

const UPCOMING_MAX_HOURS = 4 * 24;



export type AlertTimeHorizon = 'urgent' | 'near' | 'upcoming';



export type ClassifiedSecretaryAlerts = {

    urgentAlerts: SecretaryAlert[];

    nearAlerts: SecretaryAlert[];

    upcomingAlerts: SecretaryAlert[];

};



export function hoursUntilAlertDue(alert: SecretaryAlert, nowMs: number): number | null {

    const ms = dueMs(alert);

    if (ms === null) return null;

    return (ms - nowMs) / HOUR_MS;

}



export function daysUntilAlertDue(alert: SecretaryAlert, todayYmd: string): number | null {

    const ms = dueMs(alert);

    if (ms === null) return null;

    const ymd = localTodayYmd(new Date(ms));

    return daysFromTodayYmd(ymd, todayYmd);

}



function sortBucket(alerts: SecretaryAlert[]): SecretaryAlert[] {

    return [...alerts].sort((a, b) => {

        const aPin = a.fieldTaskPinned ? 0 : 1;

        const bPin = b.fieldTaskPinned ? 0 : 1;

        if (aPin !== bPin) return aPin - bPin;

        const ta = dueMs(a) ?? Number.MAX_SAFE_INTEGER;

        const tb = dueMs(b) ?? Number.MAX_SAFE_INTEGER;

        if (ta !== tb) return ta - tb;

        return a.priority - b.priority;

    });

}



function classifyFieldTaskHorizon(

    alert: SecretaryAlert,

    todayYmd: string,

): AlertTimeHorizon | null {

    const days = daysUntilAlertDue(alert, todayYmd);

    if (days === null) {

        return alert.fieldTaskPinned ? 'urgent' : null;

    }

    if (days < 0) return 'urgent';

    if (days <= 1) return 'urgent';

    if (days <= 4) return 'upcoming';

    return alert.fieldTaskPinned ? 'upcoming' : null;

}



function classifyByDaysUntil(

    days: number,

): AlertTimeHorizon | null {

    if (days < 0) return null;

    if (days <= 1) return 'urgent';

    if (days <= 4) return 'upcoming';

    return null;

}



/** تصنيف زمني: عاجل (اليوم+غدا) · قادم (3 أيام بعد غد) */

export function classifySecretaryAlertsByHorizon(

    alerts: SecretaryAlert[],

    now: Date = new Date(),

): ClassifiedSecretaryAlerts {

    const nowMs = now.getTime();

    const todayYmd = localTodayYmd(now);

    const urgent: SecretaryAlert[] = [];

    const upcoming: SecretaryAlert[] = [];



    for (const alert of alerts) {

        if (isInjectedFieldTaskAlert(alert)) {

            const bucket = classifyFieldTaskHorizon(alert, todayYmd);

            if (bucket === 'urgent') urgent.push(alert);

            else if (bucket === 'upcoming') upcoming.push(alert);

            continue;

        }



        const days = daysUntilAlertDue(alert, todayYmd);

        if (days !== null) {

            const bucket = classifyByDaysUntil(days);

            if (bucket === 'urgent') urgent.push(alert);

            else if (bucket === 'upcoming') upcoming.push(alert);

            continue;

        }



        const hoursLeft = hoursUntilAlertDue(alert, nowMs);



        if (hoursLeft === null) {
            continue;
        }



        if (hoursLeft <= 0) continue;



        if (hoursLeft <= URGENT_MAX_HOURS) {

            urgent.push(alert);

        } else if (hoursLeft <= UPCOMING_MAX_HOURS) {

            upcoming.push(alert);

        }

    }



    return {

        urgentAlerts: sortBucket(urgent),

        nearAlerts: [],

        upcomingAlerts: sortBucket(upcoming),

    };

}



export function horizonCounts(classified: ClassifiedSecretaryAlerts): Record<AlertTimeHorizon, number> {

    return {

        urgent: classified.urgentAlerts.length,

        near: classified.nearAlerts.length,

        upcoming: classified.upcomingAlerts.length,

    };

}



export function pickDefaultHorizonFilter(

    counts: Record<AlertTimeHorizon, number>,

): AlertTimeHorizon {

    if (counts.urgent > 0) return 'urgent';

    if (counts.upcoming > 0) return 'upcoming';

    return 'urgent';

}



export function alertsForHorizon(

    classified: ClassifiedSecretaryAlerts,

    filter: AlertTimeHorizon,

): SecretaryAlert[] {

    switch (filter) {

        case 'urgent':

            return classified.urgentAlerts;

        case 'near':

            return classified.upcomingAlerts;

        case 'upcoming':

            return classified.upcomingAlerts;

        default:

            return classified.urgentAlerts;

    }

}


