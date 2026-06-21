import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedCasesInbox } from '../SharedCasesInbox';
import { SharedDossierViewer } from '../SharedDossierViewer';
import { CaseShareRepository } from '@/app/services/caseShare/caseShareRepository';
import {
    PERSONAS,
    fieldsWith,
    resetCaseShareStore,
    richLawsuitSource,
} from '@/app/services/caseShare/__tests__/caseShareTestFixtures';

vi.mock('@/app/context/AuthContext', () => ({
    useAuthSafe: () => ({
        user: { id: PERSONAS.recipient.id, email: 'sara@test.com', user_metadata: { fullName: PERSONAS.recipient.name } },
    }),
}));

vi.mock('@/app/services/caseShare/caseShareApiService', () => ({
    CaseShareApiService: {
        listIncoming: (userId: string) => CaseShareRepository.listIncoming(userId),
        listShares: (userId: string) => CaseShareRepository.listForUser(userId, { summary: true }),
        getShareDetail: (shareId: string, userId: string) => CaseShareRepository.getById(shareId, userId),
        respond: (shareId: string, action: 'accept' | 'decline', userId: string) =>
            CaseShareRepository.updateStatus(shareId, userId, action === 'accept' ? 'accepted' : 'declined'),
        endSession: (shareId: string, userId: string) => CaseShareRepository.endSession(shareId, userId),
    },
}));

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: {
        confirm: vi.fn().mockResolvedValue(true),
        prompt: vi.fn(),
    },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn() },
}));

describe('SharedCasesInbox — واجهة المستقبل', () => {
    beforeEach(async () => {
        resetCaseShareStore();
        await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source: richLawsuitSource(),
            visibleFields: fieldsWith({ sectionMode: { notes: 'none' } }),
        });
    });

    it('يعرض الطلب الوارد مع اسم المرسل', async () => {
        render(<SharedCasesInbox />);
        await waitFor(() => {
            expect(screen.getByText(/من أ\. أحمد الراوي/)).toBeInTheDocument();
        });
        expect(screen.getByText(/بانتظار القبول/)).toBeInTheDocument();
    });

    it('قبول الطلب يُحدّث الحالة ويفتح المعاينة', async () => {
        render(<SharedCasesInbox />);
        await waitFor(() => expect(screen.getAllByRole('button', { name: /^قبول$/ }).length).toBeGreaterThan(0));

        fireEvent.click(screen.getAllByRole('button', { name: /^قبول$/ })[0]!);

        await waitFor(() => {
            expect(screen.getByText(/فتح الإضبارة/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/فتح الإضبارة/));

        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: /إضبارة مشتركة/ })).toBeInTheDocument();
        });
    });
});

describe('SharedDossierViewer — محتوى المستقبل', () => {
    beforeEach(() => {
        resetCaseShareStore();
    });

    it('يعرض الأقسام المصفّاة من visibleCatalog', async () => {
        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source: richLawsuitSource(),
            visibleFields: fieldsWith({
                sectionMode: { notes: 'pick' },
                hiddenItemIds: ['note:103'],
            }),
        });

        render(<SharedDossierViewer share={share} viewerUserId={PERSONAS.recipient.id} onClose={() => {}} />);

        expect(screen.getByText('الملاحظات')).toBeInTheDocument();
        expect(screen.getByText(/استراتيجية/)).toBeInTheDocument();
        expect(screen.queryByText(/07701234567/)).not.toBeInTheDocument();
    });
});
