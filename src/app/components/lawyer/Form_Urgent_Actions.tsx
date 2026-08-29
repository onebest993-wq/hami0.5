import React from 'react';
import { UrgentActionsBasicInfoSection } from './Form_Urgent_Actions/UrgentActionsBasicInfoSection';
import { UrgentActionsFormHeader } from './Form_Urgent_Actions/UrgentActionsFormHeader';
import { UrgentActionsFormSubmitBar } from './Form_Urgent_Actions/UrgentActionsFormSubmitBar';
import { UrgentActionsParty1Section } from './Form_Urgent_Actions/UrgentActionsParty1Section';
import { UrgentActionsParty2Section } from './Form_Urgent_Actions/UrgentActionsParty2Section';
import { useUrgentActionsForm } from './Form_Urgent_Actions/useUrgentActionsForm';
import type { UrgentActionsFormProps } from './Form_Urgent_Actions/urgentActionsFormTypes';

/**
 * نموذج الإجراءات المستعجلة والأوامر الولائية — منطق النموذج في useUrgentActionsForm
 */
export const Form_Urgent_Actions: React.FC<UrgentActionsFormProps> = (props) => {
    const {
        selectedSubActionType,
        setSelectedSubActionType,
        customSpecificActionType,
        setCustomSpecificActionType,
        party1List,
        party2List,
        party1EndRef,
        party2EndRef,
        formData,
        validationErrors,
        addParty1,
        removeParty1,
        updateParty1,
        addParty2,
        removeParty2,
        updateParty2,
        isIqrarContext,
        partyLabels,
        party2Hidden,
        isRespondentClient,
        partyCardTitle,
        isParty1Client,
        isParty2Client,
        toggleSideClient,
        handleSubmit,
        updateField,
        safeClose,
    } = useUrgentActionsForm(props);

    return (
        <div
            data-testid="urgent-actions-form"
            className="fixed inset-0 z-[200] bg-[#0B1021] font-['Tajawal'] overflow-hidden"
        >
            <form onSubmit={handleSubmit} className="h-full flex flex-col">
                <UrgentActionsFormHeader safeClose={safeClose} />

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-5xl mx-auto px-3 py-3 space-y-3">
                        {Object.keys(validationErrors).length > 0 && (
                            <div className="border border-red-500/25 bg-red-500/10 rounded-lg px-3 py-2 text-red-100 text-xs font-bold">
                                يرجى تصحيح الحقول الإلزامية قبل الإرسال
                            </div>
                        )}

                        <UrgentActionsBasicInfoSection
                            formData={formData}
                            validationErrors={validationErrors}
                            selectedSubActionType={selectedSubActionType}
                            setSelectedSubActionType={setSelectedSubActionType}
                            customSpecificActionType={customSpecificActionType}
                            setCustomSpecificActionType={setCustomSpecificActionType}
                            isIqrarContext={isIqrarContext}
                            updateField={updateField}
                        />

                        <UrgentActionsParty1Section
                            party1List={party1List}
                            party1EndRef={party1EndRef}
                            validationErrors={validationErrors}
                            party1Label={partyLabels.party1}
                            isIqrarContext={isIqrarContext}
                            isParty1Client={isParty1Client}
                            partyCardTitle={partyCardTitle}
                            toggleSideClient={toggleSideClient}
                            addParty1={addParty1}
                            removeParty1={removeParty1}
                            updateParty1={updateParty1}
                        />

                        {!party2Hidden && (
                            <UrgentActionsParty2Section
                                party2List={party2List}
                                party2EndRef={party2EndRef}
                                formData={formData}
                                validationErrors={validationErrors}
                                party2Label={partyLabels.party2}
                                isIqrarContext={isIqrarContext}
                                isParty2Client={isParty2Client}
                                isRespondentClient={isRespondentClient}
                                partyCardTitle={partyCardTitle}
                                toggleSideClient={toggleSideClient}
                                addParty2={addParty2}
                                removeParty2={removeParty2}
                                updateParty2={updateParty2}
                                updateField={updateField}
                            />
                        )}

                        <UrgentActionsFormSubmitBar />
                    </div>
                </div>
            </form>
        </div>
    );
};
