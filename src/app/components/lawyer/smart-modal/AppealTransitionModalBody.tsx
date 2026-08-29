import React from 'react';
import type { JudgmentModalStyles } from './smartFile/smartModalChrome';
import { AppealTransitionModalHint } from './AppealTransitionModalHint';
import { AppealTransitionModalAppealTypeSection } from './AppealTransitionModalAppealTypeSection';
import { AppealTransitionModalPartyPickers } from './AppealTransitionModalPartyPickers';
import { AppealTransitionModalFilingFields } from './AppealTransitionModalFilingFields';

type PartyRow = { id: number | string; name: string; role?: string };

export type AppealTransitionModalBodyProps = {
    s: JudgmentModalStyles;
    hintShell: string;
    judgmentType?: string;
    cassationOnlyHint: string | null;
    showJudgmentFormMeta: boolean;
    judgmentForm?: string;
    appealType: string;
    setAppealType: (value: string) => void;
    appealTypeOptions: Array<{ value: string; label: string }>;
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
    filingDate: string;
    setFilingDate: (value: string) => void;
    newCaseNumber: string;
    setNewCaseNumber: (value: string) => void;
    caseNumberLabel: string;
    caseNumberOptional?: boolean;
    caseNumberHint?: string;
};

export function AppealTransitionModalBody({
    s,
    hintShell,
    judgmentType,
    cassationOnlyHint,
    showJudgmentFormMeta,
    judgmentForm,
    appealType,
    setAppealType,
    appealTypeOptions,
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
    filingDate,
    setFilingDate,
    newCaseNumber,
    setNewCaseNumber,
    caseNumberLabel,
    caseNumberOptional,
    caseNumberHint,
}: AppealTransitionModalBodyProps) {
    return (
        <div className={s.body}>
            <AppealTransitionModalHint
                s={s}
                hintShell={hintShell}
                judgmentType={judgmentType}
                cassationOnlyHint={cassationOnlyHint}
                showJudgmentFormMeta={showJudgmentFormMeta}
                judgmentForm={judgmentForm}
            />

            <AppealTransitionModalAppealTypeSection
                s={s}
                appealType={appealType}
                setAppealType={setAppealType}
                appealTypeOptions={appealTypeOptions}
            />

            <AppealTransitionModalPartyPickers
                s={s}
                showAppellantPicker={showAppellantPicker}
                showOpponentPicker={showOpponentPicker}
                isOpponentRegistration={isOpponentRegistration}
                appellantLabel={appellantLabel}
                opponentLabel={opponentLabel}
                appellantPickerCard={appellantPickerCard}
                opponentPickerCard={opponentPickerCard}
                appellantPickerTitle={appellantPickerTitle}
                opponentPickerTitle={opponentPickerTitle}
                visibleAppellantParties={visibleAppellantParties}
                visibleOpponentParties={visibleOpponentParties}
                selectedAppellantIds={selectedAppellantIds}
                selectedOpponentIds={selectedOpponentIds}
                appellantRowSelected={appellantRowSelected}
                appellantRowIdle={appellantRowIdle}
                appellantCheckSelected={appellantCheckSelected}
                opponentRowSelected={opponentRowSelected}
                opponentRowIdle={opponentRowIdle}
                opponentCheckSelected={opponentCheckSelected}
                toggleAppellant={toggleAppellant}
                toggleOpponent={toggleOpponent}
            />

            <AppealTransitionModalFilingFields
                s={s}
                filingDate={filingDate}
                setFilingDate={setFilingDate}
                newCaseNumber={newCaseNumber}
                setNewCaseNumber={setNewCaseNumber}
                caseNumberLabel={caseNumberLabel}
                caseNumberOptional={caseNumberOptional}
                caseNumberHint={caseNumberHint}
            />
        </div>
    );
}
