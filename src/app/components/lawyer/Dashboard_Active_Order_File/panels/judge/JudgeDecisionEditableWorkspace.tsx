import React from 'react';
import { ValidationBanner } from '../../components/ValidationBanner';
import type { JudgeDecisionLifecyclePanelProps } from '../JudgeDecisionLifecyclePanelProps';
import { JudgeDecisionFormPanel } from './JudgeDecisionFormPanel';
import { JudgeFastForwardBanner } from './JudgeFastForwardBanner';
import { JudgePreDecisionHearingsPanel } from './JudgePreDecisionHearingsPanel';
import { JudgeStateOrderIntervention } from './JudgeStateOrderIntervention';

export function JudgeDecisionEditableWorkspace(props: JudgeDecisionLifecyclePanelProps) {
    const { hearingsError, judgeError } = props;

    return (
        <div className="space-y-6">
            {!!judgeError && <ValidationBanner text={judgeError} />}
            {!!hearingsError && <ValidationBanner text={hearingsError} />}
            <JudgeFastForwardBanner {...props} />
            <div className="flex flex-col gap-6">
                <JudgePreDecisionHearingsPanel {...props} />
                <JudgeDecisionFormPanel {...props} />
            </div>
            <JudgeStateOrderIntervention {...props} />
        </div>
    );
}
