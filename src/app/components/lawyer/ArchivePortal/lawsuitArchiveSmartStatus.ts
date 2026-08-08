import type { ComputedSmartStatus, LooseArchiveFile, StageWithCaseMeta } from './types';
import type { CaseStage } from '../LawyerShared';
import { isDossierFinalized } from '../smart-modal/smartFile/extraordinaryAppealGateway';

const ACTIVE_STATUS: ComputedSmartStatus = {
    type: 'active',
    label: 'مستمرة',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    timers: null,
};

function calcDaysRemaining(deadline?: string): number {
    if (!deadline) return 0;
    const target = new Date(deadline);
    const diff = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

function resolveActiveStage(
    file: LooseArchiveFile,
): StageWithCaseMeta | undefined {
    const stages = (file.stages ?? []) as StageWithCaseMeta[];
    if (!stages.length) return undefined;
    const idx =
        typeof file.activeStageIndex === 'number' && file.activeStageIndex >= 0
            ? file.activeStageIndex
            : stages.length - 1;
    return stages[idx] ?? stages[stages.length - 1];
}

export function computeLawsuitSmartStatus(file: LooseArchiveFile): ComputedSmartStatus {
    const status = String(file.status ?? '').trim();
    const stage = resolveActiveStage(file);
    const fd = String(stage?.finalDecision ?? '').trim();
    const timers = stage?.legalTimers;

    if (
        status === 'مبطلة'
        || stage?.isVoided
        || stage?.status === 'voided'
        || fd.includes('مبطلة')
    ) {
        return {
            type: 'annulled',
            label: 'مبطلة',
            color: 'text-gray-400',
            bgColor: 'bg-gray-500/10',
            borderColor: 'border-gray-500/30',
            timers: null,
        };
    }

    if (status === 'منقطعة' || Boolean(stage?.interruptionDate)) {
        return {
            type: 'interrupted',
            label: 'منقطعة',
            color: 'text-rose-300',
            bgColor: 'bg-rose-500/10',
            borderColor: 'border-rose-500/30',
            timers: null,
        };
    }

    if (status === 'مستأخرة' || status === 'موقوفة اتفاقياً') {
        return {
            type: 'paused',
            label: 'مستأخرة',
            color: 'text-amber-300',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/30',
            timers: null,
        };
    }

    if (status === 'متروكة للمراجعة' || fd.includes('متروكة للمراجعة')) {
        const reviewDays = timers?.reviewDeadline ? calcDaysRemaining(timers.reviewDeadline) : 0;
        if (reviewDays <= 0 && timers?.reviewDeadline) {
            return {
                type: 'annulled',
                label: 'مبطلة (انتهت مدة المراجعة)',
                color: 'text-gray-400',
                bgColor: 'bg-gray-500/10',
                borderColor: 'border-gray-500/30',
                timers: null,
            };
        }
        return {
            type: 'review',
            label: 'متروكة للمراجعة',
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/30',
            timers: reviewDays > 0 ? { review: reviewDays } : null,
        };
    }

    if (
        fd.includes('بانتظار الطعن')
        || fd.includes('بانتظار التمييز')
        || status.includes('بانتظار')
    ) {
        const appealDays = timers?.appealDeadline ? calcDaysRemaining(timers.appealDeadline) : 0;
        const cassationDays = timers?.cassationDeadline ? calcDaysRemaining(timers.cassationDeadline) : 0;
        return {
            type: 'waiting_appeal',
            label: 'بانتظار طعن الخصم',
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/30',
            timers: { appeal: appealDays, cassation: cassationDays },
        };
    }

    if (
        fd.includes('مكتسبة الدرجة القطعية')
        || status === 'منتهية'
        || status.includes('قطعية')
        || isDossierFinalized(status, (file.stages ?? []) as CaseStage[])
    ) {
        return {
            type: 'final',
            label: 'انتهت',
            title: 'مكتسبة الدرجة القطعية',
            color: 'text-emerald-300',
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/30',
            timers: null,
        };
    }

    return ACTIVE_STATUS;
}
