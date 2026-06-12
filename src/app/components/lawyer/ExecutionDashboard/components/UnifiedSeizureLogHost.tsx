import React from 'react';
import {
    UnifiedSeizureLogModal,
    type SeizureLogTab,
    type UnifiedSeizureLogEntry,
} from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import {
    UnifiedSeizureLogEntryFooter,
    type UnifiedSeizureLogEntryFooterProps,
} from '@/app/components/lawyer/ExecutionDashboard/components/UnifiedSeizureLogEntryFooter';
import type { UnifiedSeizureTabCounts } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntries';

export type UnifiedSeizureLogHostProps = {
    isRepresentingDebtor: boolean;
    showModal: boolean;
    hasContent: boolean;
    activeTab: SeizureLogTab;
    onTabChange: (tab: SeizureLogTab) => void;
    counts: UnifiedSeizureTabCounts;
    entries: UnifiedSeizureLogEntry[];
    onClose: () => void;
    footer: Omit<UnifiedSeizureLogEntryFooterProps, 'entry'>;
};

export function UnifiedSeizureLogHost(props: UnifiedSeizureLogHostProps) {
    const open = props.showModal && props.hasContent && !props.isRepresentingDebtor;

    return (
        <UnifiedSeizureLogModal
            open={open}
            activeTab={props.activeTab}
            onTabChange={props.onTabChange}
            counts={props.counts}
            entries={props.entries}
            onClose={props.onClose}
            renderEntryFooter={(entry) => <UnifiedSeizureLogEntryFooter entry={entry} {...props.footer} />}
        />
    );
}
