import React, { Suspense, lazy, memo } from 'react';
import { Send } from '@/app/components/ui/icons/Send';
import { Users } from '@/app/components/ui/icons/Users';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import { useCaseSharePanel } from '../hooks/useCaseSharePanel';
import { CaseShareSectionBlock } from './CaseShareSectionBlock';

const SharedDossierViewerLazy = lazy(() =>
    import('@/app/components/lawyer/caseShare/SharedDossierViewer').then((m) => ({
        default: m.SharedDossierViewer,
    })),
);

type Props = {
    userId: string;
    shares: CaseShareRecord[];
    onChanged: () => void;
};

/** قسم مشاركة الإضبارة داخل لوحة الإشعارات — وارد + نشط + منتهٍ. */
export const CaseSharePanelSection = memo(function CaseSharePanelSection({
    userId,
    shares,
    onChanged,
}: Props) {
    const vm = useCaseSharePanel({ userId, shares, onChanged });

    if (!vm.hasContent) return null;

    return (
        <>
            <CaseShareSectionBlock
                testId="case-share-incoming-section"
                title="طلبات واردة"
                count={vm.pendingIncoming.length}
                icon={Send}
                borderClassName="border-[#E6C673]/15"
                titleClassName="text-[#E6C673]"
                shares={vm.pendingIncoming}
                userId={userId}
                roleLabel={vm.roleLabel}
                busyId={vm.busyId}
                onRespond={vm.respond}
                onOpen={vm.openShare}
                onChanged={onChanged}
            />

            <CaseShareSectionBlock
                testId="case-share-active-section"
                title="جلسات نشطة"
                count={vm.activeSessions.length}
                icon={Users}
                borderClassName="border-emerald-500/15"
                titleClassName="text-emerald-300"
                shares={vm.activeSessions}
                userId={userId}
                roleLabel={vm.roleLabel}
                busyId={vm.busyId}
                onRespond={vm.respond}
                onOpen={vm.openShare}
                onChanged={onChanged}
            />

            <CaseShareSectionBlock
                testId="case-share-ended-section"
                title="جلسات منتهية"
                borderClassName="border-white/10"
                titleClassName="text-white/45"
                shares={vm.recentEnded}
                userId={userId}
                roleLabel={vm.roleLabel}
                busyId={vm.busyId}
                onRespond={vm.respond}
                onOpen={vm.openShare}
                onChanged={onChanged}
            />

            {vm.viewing ? (
                <Suspense fallback={null}>
                    <SharedDossierViewerLazy
                        share={vm.viewing}
                        viewerUserId={userId}
                        onClose={vm.closeViewer}
                        onSessionEnded={vm.handleSessionEnded}
                    />
                </Suspense>
            ) : null}
        </>
    );
});
