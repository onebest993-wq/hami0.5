/**
 * نبض المقر بعد إقلاع الاختصار — يُقرأ عند أول رسم حتى لا تظهر «بلا جلسة» ثم تتصل.
 */
import type { HeadquartersLiveStatus } from '@/app/components/admin/hqLiveOverview';
import type { HqCourtStat } from '@/app/domain/admin/hqCourtStats';

let primedStatus: HeadquartersLiveStatus | null = null;
let primedCourts: HqCourtStat[] | null = null;
let primedAudit: unknown[] | null = null;
let primedDevices: unknown[] | null = null;

export function primeHeadquartersLiveStatus(status: HeadquartersLiveStatus): void {
    if (status.sessionRequired || status.system === 'checking') return;
    primedStatus = status;
}

export function peekPrimedHeadquartersStatus(): HeadquartersLiveStatus | null {
    return primedStatus;
}

export function primeHeadquartersCourts(rows: HqCourtStat[]): void {
    primedCourts = rows;
}

export function peekPrimedHeadquartersCourts(): HqCourtStat[] | null {
    return primedCourts;
}

export function primeHeadquartersAudit(entries: unknown[]): void {
    primedAudit = entries;
}

export function peekPrimedHeadquartersAudit(): unknown[] | null {
    return primedAudit;
}

export function primeHeadquartersDevices(devices: unknown[]): void {
    primedDevices = devices;
}

export function peekPrimedHeadquartersDevices(): unknown[] | null {
    return primedDevices;
}

export function clearPrimedHeadquartersStatus(): void {
    primedStatus = null;
    primedCourts = null;
    primedAudit = null;
    primedDevices = null;
}
