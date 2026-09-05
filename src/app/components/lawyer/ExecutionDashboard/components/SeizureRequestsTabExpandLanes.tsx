import React from 'react';
import { SeizureMatrixExpandLink } from '@/app/components/lawyer/execution/SeizureMatrixExpandLink';
import {
    SeizureMovableRequestBlock,
    SeizurePropertyRequestBlock,
    SeizureThirdPartyRequestBlock,
} from './SeizureRequestsTabAssetBlocks';
import type { SharedAssetBlockProps } from './SeizureRequestsTabAssetCompletions';

export function SeizureRequestsTabExpandLanes(props: Record<string, unknown>) {
    const {
        progressive,
        additionalSeizureExpanded,
        setAdditionalSeizureExpanded,
        maximumSeizureExpanded,
        setMaximumSeizureExpanded,
        showManualButton,
        sharedAssetBlockProps,
        movableDecision,
        thirdPartyDecision,
        thirdPartyNameDraft,
        thirdPartyAmountDraft,
        setThirdPartyNameDraft,
        setThirdPartyAmountDraft,
        executionData,
        getLocalTodayYmd,
        pushTimelineEvent,
        nextTimelineId,
        persistExecutionMerge,
        propertyDecision,
    } = props as {
        progressive: { showAdditionalExpand?: boolean; showMaximumExpand?: boolean };
        additionalSeizureExpanded: boolean;
        setAdditionalSeizureExpanded: (v: boolean) => void;
        maximumSeizureExpanded: boolean;
        setMaximumSeizureExpanded: (v: boolean) => void;
        showManualButton: (key: string, lane: string) => boolean;
        sharedAssetBlockProps: SharedAssetBlockProps;
        movableDecision: unknown;
        thirdPartyDecision: unknown;
        thirdPartyNameDraft: unknown;
        thirdPartyAmountDraft: unknown;
        setThirdPartyNameDraft: unknown;
        setThirdPartyAmountDraft: unknown;
        executionData: unknown;
        getLocalTodayYmd: unknown;
        pushTimelineEvent: unknown;
        nextTimelineId: unknown;
        persistExecutionMerge: unknown;
        propertyDecision: unknown;
    };
    return (
        <>
                    {progressive.showAdditionalExpand && !additionalSeizureExpanded ? (
                        <SeizureMatrixExpandLink
                            variant="additional"
                            label="إظهار خيارات حجز إضافية..."
                            onClick={() => setAdditionalSeizureExpanded(true)}
                        />
                    ) : null}

                    {showManualButton('movable', 'additional') ? (
                        <SeizureMovableRequestBlock
                            {...sharedAssetBlockProps}
                            movableDecision={movableDecision}
                        />
                    ) : null}
                    {showManualButton('third_party', 'additional') ? (
                        <SeizureThirdPartyRequestBlock
                            {...sharedAssetBlockProps}
                            thirdPartyDecision={thirdPartyDecision}
                            thirdPartyNameDraft={thirdPartyNameDraft}
                            thirdPartyAmountDraft={thirdPartyAmountDraft}
                            setThirdPartyNameDraft={setThirdPartyNameDraft}
                            setThirdPartyAmountDraft={setThirdPartyAmountDraft}
                            executionData={executionData}
                            getLocalTodayYmd={getLocalTodayYmd}
                            pushTimelineEvent={pushTimelineEvent}
                            nextTimelineId={nextTimelineId}
                            persistExecutionMerge={persistExecutionMerge}
                        />
                    ) : null}
                    {showManualButton('property', 'additional') ? (
                        <SeizurePropertyRequestBlock
                            {...sharedAssetBlockProps}
                            propertyDecision={propertyDecision}
                        />
                    ) : null}

                    {progressive.showMaximumExpand && additionalSeizureExpanded && !maximumSeizureExpanded ? (
                        <SeizureMatrixExpandLink
                            variant="maximum"
                            label="إظهار خيارات الحجز القصوى..."
                            onClick={() => setMaximumSeizureExpanded(true)}
                        />
                    ) : null}

                    {showManualButton('movable', 'maximum') ? (
                        <SeizureMovableRequestBlock
                            {...sharedAssetBlockProps}
                            movableDecision={movableDecision}
                        />
                    ) : null}
                    {showManualButton('third_party', 'maximum') ? (
                        <SeizureThirdPartyRequestBlock
                            {...sharedAssetBlockProps}
                            thirdPartyDecision={thirdPartyDecision}
                            thirdPartyNameDraft={thirdPartyNameDraft}
                            thirdPartyAmountDraft={thirdPartyAmountDraft}
                            setThirdPartyNameDraft={setThirdPartyNameDraft}
                            setThirdPartyAmountDraft={setThirdPartyAmountDraft}
                            executionData={executionData}
                            getLocalTodayYmd={getLocalTodayYmd}
                            pushTimelineEvent={pushTimelineEvent}
                            nextTimelineId={nextTimelineId}
                            persistExecutionMerge={persistExecutionMerge}
                        />
                    ) : null}
                    {showManualButton('property', 'maximum') ? (
                        <SeizurePropertyRequestBlock
                            {...sharedAssetBlockProps}
                            propertyDecision={propertyDecision}
                        />
                    ) : null}
        </>
    );
}
