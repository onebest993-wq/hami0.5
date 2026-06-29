import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DataSection } from '@/app/components/lawyer/HamiSettings/data/DataSection';

vi.mock('@/app/context/LawyerSettingsContext', () => ({
    useLawyerSettingsReset: () => vi.fn(),
}));

vi.mock('@/app/components/lawyer/HamiSettings/hooks/useBusinessBackup', () => ({
    useBusinessBackup: () => ({
        importBusinessInputRef: { current: null },
        backupPanelOpen: false,
        toggleBackupPanel: vi.fn(),
        pendingBusinessImport: null,
        setPendingBusinessImport: vi.fn(),
        importBusinessBackup: vi.fn(),
        prepareBusinessImport: vi.fn(),
    }),
}));

vi.mock('@/app/components/lawyer/HamiSettings/hooks/useLocalDataClear', () => ({
    useLocalDataClear: () => ({
        wipePhase: 'idle',
        countdown: 0,
        cancelCountdown: vi.fn(),
        requestFullWipe: vi.fn(),
    }),
}));

vi.mock('@/app/components/lawyer/HamiSettings/data/DataSyncCard', () => ({
    DataSyncCard: () => <div data-testid="data-sync-card-mock" />,
}));

vi.mock('@/app/components/lawyer/HamiSettings/data/BusinessBackupSection', () => ({
    BusinessBackupSection: () => <div data-testid="business-backup-mock" />,
}));

vi.mock('@/app/components/lawyer/HamiSettings/data/DataDangerZone', () => ({
    DataDangerZone: () => <div data-testid="data-danger-zone-mock" />,
}));

describe('DataSection', () => {
    beforeEach(() => vi.clearAllMocks());

    it('يعرض testid وعنوان البيانات والمكونات الفرعية', () => {
        render(<DataSection />);
        expect(screen.getByTestId('settings-section-data')).toBeInTheDocument();
        expect(screen.getByText('البيانات')).toBeInTheDocument();
        expect(screen.getByText('حفظ ونسخ وتصدير')).toBeInTheDocument();
        expect(screen.getByTestId('data-sync-card-mock')).toBeInTheDocument();
        expect(screen.getByTestId('business-backup-mock')).toBeInTheDocument();
        expect(screen.getByTestId('data-danger-zone-mock')).toBeInTheDocument();
    });
});
