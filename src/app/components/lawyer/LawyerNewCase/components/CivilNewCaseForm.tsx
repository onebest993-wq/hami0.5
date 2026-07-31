import React from 'react';
import type { Party, ThirdParty } from '../types';
import { CaseBasicsForm, type CaseBasicsFormProps } from './CaseBasicsForm';
import { PartiesSection } from './PartiesSection';
import { ThirdPartiesSection } from './ThirdPartiesSection';

export type CivilNewCaseFormProps = CaseBasicsFormProps & {
    parties1: Party[];
    parties2: Party[];
    thirdParties: ThirdParty[];
    onUpdateParty: (side: 1 | 2, id: string, field: keyof Party, value: string | boolean) => void;
    onRemoveParty: (side: 1 | 2, id: string) => void;
    onAddParty: (side: 1 | 2) => void;
    addPartyButtonText1: string;
    addPartyButtonText2: string;
    onAddThirdParty: () => void;
    onRemoveThirdParty: (id: number) => void;
    onUpdateThirdParty: (id: number, field: keyof ThirdParty, value: string | boolean | number) => void;
};

/** نموذج تأسيس دعوى مدنية — CaseBasics + أطراف + أشخاص ثالث */
export function CivilNewCaseForm({
    parties1,
    parties2,
    thirdParties,
    onUpdateParty,
    onRemoveParty,
    onAddParty,
    addPartyButtonText1,
    addPartyButtonText2,
    onAddThirdParty,
    onRemoveThirdParty,
    onUpdateThirdParty,
    errorMap,
    ...basicsProps
}: CivilNewCaseFormProps) {
    const clientError = errorMap['lawyer_client'];

    return (
        <>
            <CaseBasicsForm errorMap={errorMap} {...basicsProps} />

            <PartiesSection
                side={1}
                parties={parties1}
                onUpdate={onUpdateParty}
                onRemove={onRemoveParty}
                onAdd={onAddParty}
                labels={basicsProps.labels}
                errorMap={errorMap}
                addButtonText={addPartyButtonText1}
                clientError={clientError}
            />

            <PartiesSection
                side={2}
                parties={parties2}
                onUpdate={onUpdateParty}
                onRemove={onRemoveParty}
                onAdd={onAddParty}
                labels={basicsProps.labels}
                errorMap={errorMap}
                addButtonText={addPartyButtonText2}
                clientError={clientError}
            />

            <ThirdPartiesSection
                thirdParties={thirdParties}
                onAdd={onAddThirdParty}
                onRemove={onRemoveThirdParty}
                onUpdate={onUpdateThirdParty}
                clientError={clientError}
            />
        </>
    );
}
