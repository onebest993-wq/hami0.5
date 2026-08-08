import React from 'react';

import type { Party, ThirdParty } from '../types';

import { CaseBasicsForm, type CaseBasicsFormProps } from './CaseBasicsForm';

import { PartiesSection } from './PartiesSection';

import { IncidentalSpawnPartyPickers } from './IncidentalSpawnPartyPickers';

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

    incidentalSpawnType?: 'joined' | 'counter';

    incidentalFilingPartyCandidates?: Party[];

    incidentalOpposingPartyCandidates?: Party[];

    incidentalFilingPartyId?: string | null;

    incidentalOpposingPartyId?: string | null;

    onIncidentalFilingPartySelect?: (partyId: string) => void;

    onIncidentalOpposingPartySelect?: (partyId: string) => void;

    incidentalFilingPartyError?: string;

    incidentalOpposingPartyError?: string;

    lockIncidentalParties?: boolean;

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

    incidentalSpawnType,

    incidentalFilingPartyCandidates = [],

    incidentalOpposingPartyCandidates = [],

    incidentalFilingPartyId = null,

    incidentalOpposingPartyId = null,

    onIncidentalFilingPartySelect,

    onIncidentalOpposingPartySelect,

    incidentalFilingPartyError,

    incidentalOpposingPartyError,

    lockIncidentalParties = false,

    errorMap,

    ...basicsProps

}: CivilNewCaseFormProps) {

    const clientError = errorMap['lawyer_client'];

    const showPartyPickers =

        incidentalSpawnType &&

        onIncidentalFilingPartySelect &&

        onIncidentalOpposingPartySelect &&

        (incidentalFilingPartyCandidates.length > 1 || incidentalOpposingPartyCandidates.length > 1);



    return (

        <>

            <CaseBasicsForm errorMap={errorMap} {...basicsProps} />



            {showPartyPickers ? (

                <IncidentalSpawnPartyPickers

                    spawnType={incidentalSpawnType}

                    filingCandidates={incidentalFilingPartyCandidates}

                    opposingCandidates={incidentalOpposingPartyCandidates}

                    filingPartyId={incidentalFilingPartyId}

                    opposingPartyId={incidentalOpposingPartyId}

                    onFilingPartySelect={onIncidentalFilingPartySelect}

                    onOpposingPartySelect={onIncidentalOpposingPartySelect}

                    filingPartyError={incidentalFilingPartyError}

                    opposingPartyError={incidentalOpposingPartyError}

                />

            ) : null}



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

                lockStructure={lockIncidentalParties}

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

                lockStructure={lockIncidentalParties}

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

