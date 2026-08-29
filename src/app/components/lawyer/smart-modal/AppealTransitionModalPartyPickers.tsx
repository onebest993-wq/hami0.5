import React from 'react';
import { Check } from '@/app/components/ui/icons/Check';
import type { JudgmentModalStyles } from './smartFile/smartModalChrome';

type PartyRow = { id: number | string; name: string; role?: string };

export type AppealTransitionModalPartyPickersProps = {
    s: JudgmentModalStyles;
    showAppellantPicker: boolean;
    showOpponentPicker: boolean;
    isOpponentRegistration: boolean;
    appellantLabel: string;
    opponentLabel: string;
    appellantPickerCard: string;
    opponentPickerCard: string;
    appellantPickerTitle: string;
    opponentPickerTitle: string;
    visibleAppellantParties: PartyRow[];
    visibleOpponentParties: PartyRow[];
    selectedAppellantIds: Array<number | string>;
    selectedOpponentIds: Array<number | string>;
    appellantRowSelected: string;
    appellantRowIdle: string;
    appellantCheckSelected: string;
    opponentRowSelected: string;
    opponentRowIdle: string;
    opponentCheckSelected: string;
    toggleAppellant: (id: number | string) => void;
    toggleOpponent: (id: number | string) => void;
};

export function AppealTransitionModalPartyPickers(props: AppealTransitionModalPartyPickersProps) {
    const {
        s,
        showAppellantPicker,
        showOpponentPicker,
        isOpponentRegistration,
        appellantLabel,
        opponentLabel,
        appellantPickerCard,
        opponentPickerCard,
        appellantPickerTitle,
        opponentPickerTitle,
        visibleAppellantParties,
        visibleOpponentParties,
        selectedAppellantIds,
        selectedOpponentIds,
        appellantRowSelected,
        appellantRowIdle,
        appellantCheckSelected,
        opponentRowSelected,
        opponentRowIdle,
        opponentCheckSelected,
        toggleAppellant,
        toggleOpponent,
    } = props;

    if (!(showAppellantPicker || showOpponentPicker)) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {showAppellantPicker ? (
                <div className={appellantPickerCard}>
                    <p className={`text-xs font-bold ${appellantPickerTitle}`}>
                        {isOpponentRegistration
                            ? appellantLabel
                            : `الطاعنون · ${appellantLabel}`}
                    </p>
                    <div className="space-y-1.5 mt-3">
                        {visibleAppellantParties.map((party) => {
                            const selected = selectedAppellantIds.includes(party.id);
                            return (
                                <button
                                    key={String(party.id)}
                                    type="button"
                                    onClick={() => toggleAppellant(party.id)}
                                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-right text-sm transition-all ${
                                        selected ? appellantRowSelected : appellantRowIdle
                                    }`}
                                >
                                    <span className="min-w-0 flex-1 text-right">
                                        <span className="block truncate font-medium">{party.name}</span>
                                        {party.role ? (
                                            <span className={`block text-[9px] truncate mt-0.5 ${s.isPearl ? 'text-[#9894A0]/70' : 'text-white/35'}`}>
                                                {party.role}
                                            </span>
                                        ) : null}
                                    </span>
                                    <span
                                        className={`shrink-0 w-6 h-6 rounded-md border flex items-center justify-center ${
                                            selected
                                                ? appellantCheckSelected
                                                : 'border-white/10 text-transparent'
                                        }`}
                                    >
                                        <Check size={12} strokeWidth={3} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {showOpponentPicker ? (
                <div className={opponentPickerCard}>
                    <p className={`text-xs font-bold ${opponentPickerTitle}`}>
                        {isOpponentRegistration
                            ? opponentLabel
                            : `المخاصَمون · ${opponentLabel}`}
                    </p>
                    <div className="space-y-1.5 mt-3">
                        {visibleOpponentParties.map((party) => {
                            const selected = selectedOpponentIds.includes(party.id);
                            return (
                                <button
                                    key={String(party.id)}
                                    type="button"
                                    onClick={() => toggleOpponent(party.id)}
                                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-right text-sm transition-all ${
                                        selected ? opponentRowSelected : opponentRowIdle
                                    }`}
                                >
                                    <span className="min-w-0 flex-1 text-right">
                                        <span className="block truncate font-medium">{party.name}</span>
                                        {party.role ? (
                                            <span className={`block text-[9px] truncate mt-0.5 ${s.isPearl ? 'text-[#9894A0]/70' : 'text-white/35'}`}>
                                                {party.role}
                                            </span>
                                        ) : null}
                                    </span>
                                    <span
                                        className={`shrink-0 w-6 h-6 rounded-md border flex items-center justify-center ${
                                            selected
                                                ? opponentCheckSelected
                                                : 'border-white/10 text-transparent'
                                        }`}
                                    >
                                        <Check size={12} strokeWidth={3} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
