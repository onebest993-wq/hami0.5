import React from 'react';

import type { CriminalDefendant } from '../criminalStore';

import {
    UNKNOWN_DEFENDANT_PURGE_AUTO_SCOPE_MESSAGE,
    isDefendantIdentityUnknown,
} from '../criminalUnknownDefendant';

import { filterSelectableDefendantsForScope } from '../partyPersonalStage';
import { purgeDecisionIncludesUnknownDefendants } from '../proceduralRequestTypes';

import { UnknownDefendantPartyBlockedRow } from './UnknownDefendantPartyBlockedRow';

export type DefendantDecisionScopePickerProps = {
    defendants: CriminalDefendant[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    title?: string;
    /** قالب قرار الغلق/الصلح/التفريق — المجهول يظهر فقط في غلق مؤقت وتفريق. */
    proceduralTemplate?: string;
    /** يُظهر المكوّن حتى لمتهم واحد (مطلوب لقرارات الغلق/الصلح/التفريق). */
    alwaysShow?: boolean;
};

export const DefendantDecisionScopePicker = ({
    defendants,
    selectedIds,
    onChange,
    title = 'المتهمون المشمولون بهذا القرار (إلزامي)',
    proceduralTemplate,
    alwaysShow = false,
}: DefendantDecisionScopePickerProps) => {
    const all = Array.isArray(defendants) ? defendants : [];
    const selectable = filterSelectableDefendantsForScope(all);
    const unknownAppliesToThisPurge = purgeDecisionIncludesUnknownDefendants(proceduralTemplate);
    const unknownForDisplay = unknownAppliesToThisPurge
        ? all.filter((d) => isDefendantIdentityUnknown(d))
        : [];

    if (!alwaysShow && selectable.length <= 1 && unknownForDisplay.length === 0) {
        return null;
    }

    if (!selectable.length && !unknownForDisplay.length) {
        return (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100 text-xs font-bold whitespace-normal break-words">
                لا يوجد متهمون قابلون للإدراج في هذا القرار.
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-2">
            <div className="text-white font-black text-xs whitespace-normal break-words">{title}</div>
            {selectable.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectable.map((d) => {
                        const label = String(d.fullName ?? '').trim() || '—';
                        const checked = selectedIds.includes(d.id);
                        const locked = Boolean((d as { isPartyRecordLocked?: boolean }).isPartyRecordLocked);
                        return (
                            <label
                                key={d.id}
                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${
                                    locked
                                        ? 'border-red-900/50 bg-red-950/30 text-red-200/80 cursor-not-allowed'
                                        : 'border-slate-700 bg-slate-900 text-white/85 cursor-pointer'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-[#E6C673]"
                                    checked={checked}
                                    disabled={locked}
                                    onChange={() => {
                                        if (locked) return;
                                        onChange(
                                            checked
                                                ? selectedIds.filter((x) => x !== d.id)
                                                : [...selectedIds, d.id],
                                        );
                                    }}
                                />
                                <span className="whitespace-normal break-words">{label}</span>
                                {locked ? <span className="text-[10px]">🔒</span> : null}
                            </label>
                        );
                    })}
                </div>
            ) : null}
            {unknownForDisplay.length ? (
                <div className="space-y-2 pt-1">
                    {unknownForDisplay.map((d) => (
                        <UnknownDefendantPartyBlockedRow
                            key={d.id}
                            fullName={String(d.fullName ?? '')}
                            note={UNKNOWN_DEFENDANT_PURGE_AUTO_SCOPE_MESSAGE}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
};
