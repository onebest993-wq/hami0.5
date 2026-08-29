import React from 'react';
import {
    UnifiedSeizureLogModal,
    type SeizureLogTab,
} from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';
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
    const open = props.showModal && !props.isRepresentingDebtor;
    const sanitizedCounts = {
        property: Number.isFinite(props.counts.property) ? props.counts.property : 0,
        salary: Number.isFinite(props.counts.salary) ? props.counts.salary : 0,
        movable: Number.isFinite(props.counts.movable) ? props.counts.movable : 0,
        third_party: Number.isFinite(props.counts.third_party) ? props.counts.third_party : 0,
    };

    return (
        <UnifiedSeizureLogModal
            open={open}
            activeTab={props.activeTab}
            onTabChange={props.onTabChange}
            counts={sanitizedCounts}
            entries={props.entries}
            onClose={props.onClose}
            renderEntryFooter={(entry) => <UnifiedSeizureLogEntryFooter entry={entry} {...props.footer} />}
        />
    );
}
