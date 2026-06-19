// ✅ SECURITY FIX: Using persistenceRepository.load() instead of .get() - v2.0.2-20260306
import React from 'react';
import { LawyerSettingsProvider } from '@/app/context/LawyerSettingsContext';
import { 
    LawyerDashboardQuantumShell,
    type LawyerDashboardShellProps,
} from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';

export const LawyerDashboard = React.memo((props: LawyerDashboardShellProps) => (
    <LawyerSettingsProvider>
        <LawyerDashboardQuantumShell {...props} />
    </LawyerSettingsProvider>
));
