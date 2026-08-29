/**
 * دورة إقلاع اللوحة — بلا اعتماديات.
 * علامة performance تبقى بعد HMR؛ هذه الدورة تُصفَّر مع كل تركيب Inner.
 */

let bootCycle = 0;
let firstTabOpenCycle = -1;

/** يُستدعى مرة عند تركيب Inner — إقلاع جديد لا يرث first-tab من مستند سابق */
export function beginLawyerDashboardBootCycle(): void {
    bootCycle += 1;
}

export function hasLawyerDashboardFirstTabOpenedThisBoot(): boolean {
    return bootCycle > 0 && firstTabOpenCycle === bootCycle;
}

/** @returns true إذا سُجِّل first-tab لأول مرة في هذه الدورة */
export function noteLawyerDashboardFirstTabOpenThisBoot(): boolean {
    if (bootCycle === 0) bootCycle = 1;
    if (firstTabOpenCycle === bootCycle) return false;
    firstTabOpenCycle = bootCycle;
    return true;
}

export function resetLawyerDashboardBootCycleForTests(): void {
    bootCycle = 0;
    firstTabOpenCycle = -1;
}
