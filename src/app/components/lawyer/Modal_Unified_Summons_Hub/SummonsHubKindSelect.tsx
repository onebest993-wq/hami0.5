import React from 'react';
import { HUB_SELECT_CLASS } from './summonsHubStyles';

export type HubMainTab = 'tabligh' | 'taklif' | 'nashr' | 'guarantor';

export interface SummonsHubKindSelectProps {
    hubTabOptions: { value: HubMainTab; label: string }[];
    memoArchivedResolved: boolean;
    notificationCount: number;
    hubMainTab: HubMainTab;
    onHubMainTabChange: (v: HubMainTab) => void;
    onClearTaklifFormError: () => void;
    onClearNashrFormError: () => void;
}

export const SummonsHubKindSelect: React.FC<SummonsHubKindSelectProps> = ({
    hubTabOptions,
    memoArchivedResolved,
    notificationCount,
    hubMainTab,
    onHubMainTabChange,
    onClearTaklifFormError,
    onClearNashrFormError,
}) => {
    if (!(hubTabOptions.length > 1 && !(!memoArchivedResolved && notificationCount <= 1))) {
        return null;
    }
    return (
        <div className="mb-4">
            <label
                htmlFor="unified-summons-kind"
                className="mb-2 block text-right text-xs font-semibold text-gray-300"
            >
                نوع التبليغ
            </label>
            <select
                id="unified-summons-kind"
                value={hubMainTab}
                onChange={(e) => {
                    const v = e.target.value as 'tabligh' | 'taklif' | 'nashr' | 'guarantor';
                    onHubMainTabChange(v);
                    onClearTaklifFormError();
                    onClearNashrFormError();
                }}
                className={HUB_SELECT_CLASS}
                dir="rtl"
            >
                {hubTabOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </div>
    );
};
