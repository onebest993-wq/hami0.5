import React from 'react';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import type {
    JudgmentPresenceForm,
    PartyJudgmentDisposition,
    PartyJudgmentOperative,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import {
    isPresentLikeJudgmentForm,
    partyDispositionId,
    resolvePartyJudgmentOperative,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';

type DefendantLike = {
    id?: unknown;
    name?: unknown;
    role?: unknown;
};

export function JudgmentDefendantFormList({
    styles: s,
    defendants,
    dispositions,
    onPartyFormChange,
    onPartyOperativeChange,
    showOperative = true,
}: {
    styles: JudgmentModalStyles;
    defendants: DefendantLike[];
    dispositions: PartyJudgmentDisposition[];
    onPartyFormChange: (partyId: string, form: JudgmentPresenceForm) => void;
    onPartyOperativeChange: (partyId: string, operative: PartyJudgmentOperative) => void;
    showOperative?: boolean;
}) {
    const byId = new Map(dispositions.map((row) => [row.partyId, row]));

    return (
        <div className={s.section} data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentPartyFormList}>
            <label className={s.label}>
                {showOperative ? 'لكل مدعى عليه: النتيجة والحضور' : 'شكل الحكم لكل مدعى عليه'}
            </label>
            <div className="flex flex-col gap-2 w-full">
                {defendants.map((party) => {
                    const partyId = partyDispositionId(party);
                    const row = byId.get(partyId);
                    const form = row?.form ?? 'حضوري';
                    const operative = resolvePartyJudgmentOperative(row);
                    const present = isPresentLikeJudgmentForm(form);
                    const name = String(party.name ?? '').trim() || `طرف ${partyId}`;
                    return (
                        <div key={partyId} className="flex flex-col gap-1.5 w-full">
                            <p className="text-xs text-white/55 truncate" title={name}>
                                {name}
                            </p>
                            {showOperative ? (
                                <div className="flex flex-wrap gap-2 w-full">
                                    <button
                                        type="button"
                                        data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentOperativeBoundParty(partyId)}
                                        aria-pressed={operative === 'bound'}
                                        onClick={() => onPartyOperativeChange(partyId, 'bound')}
                                        className={`${s.toggle} ${
                                            operative === 'bound' ? s.toggleActive : s.toggleIdle
                                        }`}
                                    >
                                        إلزام
                                    </button>
                                    <button
                                        type="button"
                                        data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentOperativeReleasedParty(partyId)}
                                        aria-pressed={operative === 'released'}
                                        onClick={() => onPartyOperativeChange(partyId, 'released')}
                                        className={`${s.toggle} ${
                                            operative === 'released' ? s.toggleActive : s.toggleIdle
                                        }`}
                                    >
                                        رد بحقه
                                    </button>
                                </div>
                            ) : null}
                            <div className="flex flex-wrap gap-2 w-full">
                                <button
                                    type="button"
                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadariParty(partyId)}
                                    aria-pressed={present}
                                    onClick={() => onPartyFormChange(partyId, 'حضوري')}
                                    className={`${s.toggle} ${
                                        present ? s.toggleActive : s.toggleIdle
                                    }`}
                                >
                                    حضوري
                                </button>
                                <button
                                    type="button"
                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabiParty(partyId)}
                                    aria-pressed={form === 'غيابي'}
                                    onClick={() => onPartyFormChange(partyId, 'غيابي')}
                                    className={`${s.toggle} ${
                                        form === 'غيابي' ? s.toggleActive : s.toggleIdle
                                    }`}
                                >
                                    غيابي
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
