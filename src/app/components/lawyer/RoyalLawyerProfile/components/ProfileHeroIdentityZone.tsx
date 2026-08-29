import React from 'react';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { PROFILE_THEME } from '../profileThemeClasses';
import { LAWYER_PROFILE_NAME_INPUT_ID } from '@/app/components/lawyer/RoyalLawyerProfile/profileHeroDomIds';
import type { DisplayNamePolicy } from '@/app/domain/profile/displayNameCorrection';
import {
    DISPLAY_NAME_EDIT_NOTE,
    DISPLAY_NAME_USED_NOTE,
} from '@/app/domain/profile/displayNameCorrection';

export type ProfileHeroIdentityZoneProps = {
    isEditing: boolean;
    readOnly: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    displayNamePublic: string;
    syndicateIdPublic: string | undefined;
    showSyndicate: boolean | string | undefined;
    displayNamePolicy?: DisplayNamePolicy | null;
};

export function ProfileHeroIdentityZone({
    isEditing,
    readOnly,
    draft,
    setDraft,
    displayNamePublic,
    syndicateIdPublic,
    showSyndicate,
    displayNamePolicy = null,
}: ProfileHeroIdentityZoneProps): React.ReactElement {
    const nameLocked = Boolean(displayNamePolicy?.correctionUsed);
    const previousName = displayNamePolicy?.previousFullName?.trim() || '';
    if (isEditing && draft && !readOnly) {
        return (
            <div className="hami-profile-identity hami-profile-identity--edit">
                <label className="hami-profile-identity__label" htmlFor={LAWYER_PROFILE_NAME_INPUT_ID}>
                    الاسم المعروض
                </label>
                <input
                    id={LAWYER_PROFILE_NAME_INPUT_ID}
                    data-testid={LAWYER_PROFILE_NAME_INPUT_ID}
                    value={draft.header.name}
                    maxLength={80}
                    enterKeyHint="done"
                    autoComplete="name"
                    autoCorrect="off"
                    readOnly={nameLocked}
                    aria-readonly={nameLocked || undefined}
                    onChange={(e) => {
                        if (nameLocked) return;
                        const name = e.target.value;
                        setDraft((prev) =>
                            prev ? { ...prev, header: { ...prev.header, name } } : prev,
                        );
                    }}
                    className={`hami-profile-identity__input ${PROFILE_THEME.input}`}
                    placeholder="الاسم الكامل"
                />
                <p className="hami-profile-identity__note" data-testid="lawyer-profile-name-correction-note">
                    {nameLocked ? DISPLAY_NAME_USED_NOTE : DISPLAY_NAME_EDIT_NOTE}
                </p>
            </div>
        );
    }

    return (
        <div className="hami-profile-identity">
            <h1 className="hami-profile-identity__name" dir="auto">
                <span className="hami-profile-identity__name-text">{displayNamePublic}</span>
                {previousName ? (
                    <span className="hami-profile-identity__was" data-testid="lawyer-profile-previous-name">
                        كان: {previousName}
                    </span>
                ) : null}
            </h1>
            {showSyndicate ? (
                <p className="hami-profile-identity__badge">نقابة المحامين · {syndicateIdPublic}</p>
            ) : null}
        </div>
    );
}
