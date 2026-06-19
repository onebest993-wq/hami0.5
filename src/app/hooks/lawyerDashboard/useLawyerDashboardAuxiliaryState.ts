import { useState } from 'react';

export function useLawyerDashboardAuxiliaryState() {
    const [showUrgentDashboard, setShowUrgentDashboard] = useState(false);
    const [urgentFocusCaseId, setUrgentFocusCaseId] = useState<string | undefined>();
    const [showAddClientModal, setShowAddClientModal] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');

    return {
        urgent: {
            showUrgentDashboard,
            setShowUrgentDashboard,
            urgentFocusCaseId,
            setUrgentFocusCaseId,
        },
        client: {
            showAddClientModal,
            setShowAddClientModal,
            newClientName,
            setNewClientName,
            newClientPhone,
            setNewClientPhone,
        },
    };
}
