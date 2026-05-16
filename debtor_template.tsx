import React from 'react';

const effectiveDebtors = [];
const activeTimelineEventsDebtorScoped = [];
const activeTimelineEvents = [];
const executeOnDebtorRef = {};
const checkCoercionAction = () => {};
const updateNotesPortal = null;
const isTestMode = false;
const executionData = {guarantor_followup: {executor_approved: true, guarantee_type: 'amount'}};
const specialRequestTemplateMenuOpen = false;

export default function DebtorBlock() {
return (
  <>
    {effectiveDebtors.map((raw, loopIdx) => {
      const debtorKey = raw.id;
      return (
        <div key={debtorKey}>
        {/* WE INJECT THE BLOCK HERE */}
        </div>
      );
    })}
  </>
);
}
