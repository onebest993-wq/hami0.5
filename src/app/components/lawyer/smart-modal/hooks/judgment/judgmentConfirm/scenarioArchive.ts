import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    isSulhJudgmentType,
    JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY,
    JUDGMENT_TYPE_WAIVER,
} from '../../../smartFile/judgmentTypes';


import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';

export function applyArchiveScenarios(scope: JudgmentConfirmScope, rt: JudgmentConfirmRuntime): void {
    const { currentStage, activeStageIndex, parentData, stages, setStatus, setActiveStageIndex } = scope;
    const {
        judgmentData,
        action,
        judgmentType,
        judgmentForm,
        judgmentDate,
        notes,
        nextStage,
        now,
        stageName,
        addDays,
        updatedStages,
    } = rt;

if (action === 'archive_review') {
    rt.handled = true;
    // ... existing logic ...
    updatedStages[activeStageIndex] = {
        ...currentStage,
        status: 'completed',
        finalDecision: 'متروكة للمراجعة',
        decisionDate: judgmentDate,
        legalTimers: {
            reviewDeadline: addDays(now, 10)
        }
    };

    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_${Date.now()}`,
        type: 'decision',
        date: judgmentDate,
        title: '🔄 قرار بترك الدعوى للمراجعة',
        details: `${notes}\n\n⚠️ الدعوى متروكة للمراجعة.\n⏳ سيتم الإبطال التلقائي إذا لم تتم المراجعة خلال:\n\n📅 موعد المراجعة النهائي: ${addDays(now, 10)}`,
        isNew: true
    }, ...(currentStage.timeline ?? [])];
}

// ========================================
// SCENARIO 3: إبطال (Annulled)
// ========================================
else if (action === 'archive_annulled') {
    rt.handled = true;
    updatedStages[activeStageIndex] = {
        ...currentStage,
        status: 'completed',
        finalDecision: 'مبطلة',
        decisionDate: judgmentDate
    };

    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_${Date.now()}`,
        type: 'decision',
        date: judgmentDate,
        title: '⚫ قرار بإبطال الدعوى',
        details: `${notes}\n\n⚖️ تم إبطال الدعوى رسمياً.\n📁 الملف تم أرشفته كدعوى ملغاة.`,
        isNew: true
    }, ...(currentStage.timeline ?? [])];
}

// ========================================
// 🔥 NEW SCENARIO 3.5: NON-MERIT TERMINATIONS (النهايات الرضائية)
// ========================================
else if (action === 'finalize_non_merit') {
    rt.handled = true;
    updatedStages[activeStageIndex] = {
        ...currentStage,
        status: 'completed',
        finalDecision: 'مكتسبة الدرجة القطعية',
        decisionDate: judgmentDate,
        isPleadingsClosed: true
    };

    let titleText = '📜 ';
    let detailsText = '';

    if (isSulhJudgmentType(judgmentType)) {
        titleText += 'الصلح (مكتسبة الدرجة القطعية)';
        detailsText = `${notes}\n\n✅ تم تصديق الصلح بين الأطراف.\n🏛️ يعتبر الصلح بمثابة حكم مكتسب الدرجة القطعية.\n🔒 لا يقبل أي طعن (مادة 455 مرافعات).`;
    } else if (judgmentType === JUDGMENT_TYPE_WAIVER) {
        titleText += 'التنازل عن الدعوى (مكتسبة الدرجة القطعية)';
        detailsText = `${notes}\n\n✅ تنازل المدعي عن دعواه.\n🏛️ يعتبر التنازل إنهاءً نهائياً للدعوى.\n🔒 لا يقبل أي طعن.`;
    } else if (judgmentType === JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY) {
        titleText += 'إبطال عريضة الدعوى (مكتسبة الدرجة القطعية)';
        detailsText = `${notes}\n\n⚫ تم إبطال عريضة الدعوى قانوناً.\n🏛️ إنهاء نهائي للدعوى.\n🔒 لا يقبل أي طعن.`;
    }

    updatedStages[activeStageIndex].timeline = [{
        id: `non_merit_${Date.now()}`,
        type: 'milestone',
        date: judgmentDate,
        title: titleText,
        details: detailsText,
        isNew: true,
        color: 'emerald'
    }, ...(currentStage.timeline ?? [])];

    // Update parent status
    setStatus('مكتسبة الدرجة القطعية');

    SmartToast.success(`تم إنهاء الدعوى: ${judgmentType} ✅`);
}
}
