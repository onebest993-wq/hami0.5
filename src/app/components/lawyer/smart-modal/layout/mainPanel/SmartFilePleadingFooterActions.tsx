import React from 'react';
import { isCassationStageName } from '../../smartFile/judgmentTypes';
import { isCassationCorrectionStageName } from '../../smartFile/extraordinaryAppealGateway';
import type { CaseStage } from '../../../LawyerShared';
import { PleadingCloseDecisionFlow } from './PleadingCloseDecisionFlow';

/**
 * شريط ختام المرافعة المدني:
 * مراحل الترافع (بداءة / استئناف / اعتراض…) → تاريخ → (فتح باب المرافعة | قرار الحكم).
 * التمييز والتصحيح بلا ترافع → تاريخ ثم قرار الحكم مباشرة.
 */
export function SmartFilePleadingFooterActions({
    displayStage,
    footerPrimaryLabel,
    onAdjournPleading,
    onOpenJudgment,
    compactRow = false,
}: {
    displayStage: CaseStage;
    footerPrimaryLabel: string;
    onAdjournPleading: () => void;
    onOpenJudgment: (decisionDate: string) => void;
    compactRow?: boolean;
}) {
    const stageName = String(displayStage?.stageName ?? displayStage?.name ?? '');
    const noPleadingFork =
        isCassationStageName(stageName) || isCassationCorrectionStageName(stageName);

    return (
        <PleadingCloseDecisionFlow
            primaryLabel={footerPrimaryLabel}
            showAdjournFork={!noPleadingFork}
            onAdjournPleading={onAdjournPleading}
            onOpenJudgment={onOpenJudgment}
            tone="civil"
            compactRow={compactRow}
        />
    );
}
