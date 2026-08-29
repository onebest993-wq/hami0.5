import React from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import { ProfileContactChannel } from './ProfileContactChannel';
import { ProfileContactEditRow } from './ProfileContactEditRow';
import { ProfileContactEmptyHint } from './ProfileContactEmptyHint';
import {
    CONTACT_CHANNEL_OPTIONS,
    useProfileContactSectionOps,
} from '../hooks/useProfileContactSectionOps';

type ProfileContactSectionProps = {
    isEditing: boolean;
    readOnly: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    actions: ProfileAction[];
    visibleActions: ProfileAction[];
    addContactChannel: (type: ProfileAction['type']) => void;
};

export function ProfileContactSection({
    isEditing,
    readOnly,
    draft,
    setDraft,
    actions,
    visibleActions,
    addContactChannel,
}: ProfileContactSectionProps) {
    const canEdit = isEditing && !readOnly;
    const editingActions = canEdit ? actions : visibleActions;
    const hasRenderedActions = editingActions.length > 0;
    const { locatingActionId, updateActionLabel, updateActionValue, removeAction, locateAction } =
        useProfileContactSectionOps({ draft, setDraft });

    return (
        <section className="hami-profile-section">
            <div className="hami-profile-section-head">
                <h2 className="hami-profile-section-title hami-profile-section-title--display">
                    قنوات التواصل
                </h2>
            </div>

            {canEdit ? (
                <div className="flex flex-wrap gap-2 mb-4">
                    {CONTACT_CHANNEL_OPTIONS.map((opt) => (
                        <button
                            key={opt.type}
                            type="button"
                            onClick={() => addContactChannel(opt.type)}
                            data-testid={`profile-contact-add-${opt.type}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-[11px] font-bold hami-profile-accent-btn border transition-colors"
                        >
                            <Plus size={12} />
                            {opt.label}
                        </button>
                    ))}
                </div>
            ) : null}

            {!hasRenderedActions ? (
                <ProfileContactEmptyHint isEditing={canEdit} />
            ) : (
                <div className="hami-profile-contact-stack">
                    {editingActions.map((action) =>
                        canEdit && draft ? (
                                <ProfileContactEditRow
                                    key={action.id}
                                    action={action}
                                    locatingActionId={locatingActionId}
                                    updateActionLabel={updateActionLabel}
                                    updateActionValue={updateActionValue}
                                    removeAction={removeAction}
                                    locateAction={locateAction}
                                />
                            ) : (
                                <ProfileContactChannel key={action.id} action={action} />
                            ),
                        )}
                    </div>
            )}
        </section>
    );
}
