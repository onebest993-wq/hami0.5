import {
    isAppealStageName,
    isCassationStageName,
} from '../../smartFile/judgmentTypes';
import {
    absentObjectionJudgmentOptionsForClient,
} from '../../smartFile/absentJudgmentFlow';
import { isAbsentObjectionStageName } from '../../smartFile/absentJudgmentStageNames';
import {
    hasInterpleaderParties,
    interpleaderFirstInstanceJudgmentOptions,
    interpleaderTerminationJudgmentOptions,
    type JudgmentOptionWithHint,
} from '../../smartFile/interpleaderJudgmentEngine';
import { isCassationCorrectionStageName } from '../../smartFile/extraordinaryAppealGateway';
import type { Party } from '../../../LawyerShared';

export type JudgmentOption = JudgmentOptionWithHint;

export function judgmentOptionsForStage(
    currentStage: string,
    parties?: Party[],
): JudgmentOption[] {
    if (isAbsentObjectionStageName(currentStage)) {
        return absentObjectionJudgmentOptionsForClient(parties);
    }
    if (isCassationCorrectionStageName(currentStage)) {
        return [
            { value: 'قبول طلب التصحيح', label: 'قبول طلب التصحيح' },
            { value: 'رد طلب التصحيح', label: 'رد طلب التصحيح' },
        ];
    }
    if (isCassationStageName(currentStage)) {
        return [
            { value: 'تصديق الحكم', label: 'تصديق الحكم' },
            { value: 'نقض الحكم وإعادة الإضبارة', label: 'نقض الحكم وإعادة الإضبارة' },
            { value: 'رد الطعن التمييزي شكلاً', label: 'رد الطعن التمييزي شكلاً' },
        ];
    }
    if (isAppealStageName(currentStage)) {
        return [
            { value: 'تأييد الحكم البدائي ورد الاستئناف', label: 'تأييد الحكم المستأنف ورد الاستئناف' },
            { value: 'فسخ الحكم البدائي كلياً', label: 'فسخ الحكم المستأنف كلياً' },
            { value: 'فسخ الحكم البدائي جزئياً', label: 'فسخ الحكم المستأنف جزئياً' },
            { value: 'رد الاستئناف شكلاً', label: 'رد الاستئناف شكلاً' },
        ];
    }
    if (hasInterpleaderParties(parties)) {
        return [
            ...interpleaderFirstInstanceJudgmentOptions(),
            ...interpleaderTerminationJudgmentOptions(),
        ];
    }
    return [
        { value: 'إجابة الدعوى بالكامل', label: 'إجابة الدعوى بالكامل (كسب الدعوى)' },
        { value: 'رد الدعوى كلياً', label: 'رد الدعوى كلياً (خسارة الدعوى)' },
        { value: 'رد الدعوى جزئياً', label: 'رد الدعوى جزئياً (كسب/خسارة جزئية)' },
    ];
}
