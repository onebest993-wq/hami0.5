import type { Party } from '../../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    isSulhJudgmentType,
    JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY,
    JUDGMENT_TYPE_WAIVER,
} from '../../../smartFile/judgmentTypes';
import {
    interpleaderClientAwaitingOpponentAppeal,
    isInterpleaderJudgmentType,
    resolveInterpleaderDecisionText,
    resolveLawyerJudgmentBucket,
} from '../../../smartFile/interpleaderJudgmentEngine';
import { applyCassationRemand, cassationRemandSuccessMessage, resolveCassationRemandTarget } from '../../../smartFile/appealStageTransition';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';
import type { CaseStage, Party } from '../../../../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

export function applyTransitionScenario(scope: JudgmentConfirmScope, rt: JudgmentConfirmRuntime): void {
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

if (action === 'transition') {
    rt.handled = true;
    debug.log('🔄 بدء عملية الانتقال للمرحلة التالية...');
    
    // Determine Decision Text based on Type
    let decisionText = `انتقال للمرحلة التالية (${judgmentType})`;
    let timelineTitle = `➡️ حكم بـ ${judgmentType} والانتقال`;
    
    if (judgmentType === 'إجابة الدعوى' || judgmentType === 'إجابة الدعوى بالكامل') {
        decisionText = 'إجابة الدعوى (حكم لصالح الموكل)';
        timelineTitle = '✅ حكم بإجابة الدعوى (حكم لصالح الموكل)';
    } else if (judgmentType === 'رد الدعوى' || judgmentType === 'رد الدعوى كلياً') {
        decisionText = 'رد الدعوى (حكم ضد الموكل)';
        timelineTitle = '❌ حكم برد الدعوى (حكم ضد الموكل)';
    } else if (judgmentType === 'رد الدعوى جزئياً') {
        decisionText = 'رد الدعوى جزئياً (حكم جزئي)';
        timelineTitle = '⚠️ حكم برد الدعوى جزئياً';
    }

    // STEP 1: Archive Current Stage
    updatedStages[activeStageIndex] = {
        ...currentStage,
        status: 'locked', 
        finalDecision: decisionText, // ✅ DYNAMIC DECISION
        decisionDate: judgmentDate,
        judgmentForm: judgmentForm
    };

    // Add judgment event to archived stage
    updatedStages[activeStageIndex].timeline = [{
        id: `judgment_${Date.now()}`,
        type: 'decision',
        date: judgmentDate,
        title: timelineTitle, // ✅ DYNAMIC TITLE
        details: `${notes}\n\n⚖️ صدر الحكم بـ "${judgmentType}".\n➡️ تم الانتقال مباشرة للمرحلة القادمة: ${nextStage}\n\n📁 تم أرشفة هذه المرحلة وحفظها كملف فرعي.`,
        isNew: true
    }, ...(currentStage.timeline ?? [])];

    debug.log(`📁 تم أرشفة مرحلة "${currentStage.stageName}" بالكامل`);

    // STEP 2: Wipe Parties (As requested by user)
    // No carrying over names or roles. Completely blank slate.
    const newParties: Party[] = [
        { id: Date.now(), role: 'صفة اطرف الأول', name: '', isClient: true, side: 'right' },
        { id: Date.now() + 1, role: 'صفة الطرف الثاني', name: '', isClient: false, side: 'left' },
    ];

    debug.log(`✨ تم تصفية أطراف الدعوى للمرحلة الجديدة: "${nextStage}"`);

    // STEP 4: CREATE THE NEW CLEAN SLATE STAGE (Child File)
    const newStageId = `stage_${Date.now()}`;
    const newStageObject: CaseStage = {
        id: newStageId,
        name: nextStage,
        stageName: nextStage,
        type: currentStage.type,
        caseNo: '',
        court: '',
        judge: '',
        timeline: [],
        tasks: [],
        incidentalCases: [],
        parties: newParties,
        createdDate: getLocalTodayYmd(),
        finalDecision: null,
        decisionDate: null,
        status: 'active',
    };

    debug.log(`✨ تم إنشاء مرحلة جديدة نظيفة: "${nextStage}"`);
    debug.log('📋 Timeline الجديد فارغ تماماً:', newStageObject.timeline?.length === 0);

    updatedStages.push(newStageObject);
    setActiveStageIndex(updatedStages.length - 1);

    // STEP 6: CRITICAL - Dynamic Stepper Update
    // Instead of searching by name, we rebuild stepper from actual stages
    // This allows for infinite custom stage names (e.g., "إعادة المحاكمة", "التنفيذ")
    debug.log(`🎯 تم تفعيل المرحلة الجديدة: \"${nextStage}\" بشكل ديناميكي`);
    debug.log(`📊 عدد المراحل الكلي: ${updatedStages.length}`);
}
}
