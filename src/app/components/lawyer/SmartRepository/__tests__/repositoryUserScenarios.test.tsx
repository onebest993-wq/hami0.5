import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UniversalEntryCard } from '../UniversalEntryCard';
import { RepositoryFeedPanel } from '../RepositoryFeedPanel';
import { RepositoryAddMenu } from '../RepositoryAddMenu';
import { useRepositoryEscapeStack } from '../hooks/useRepositoryEscapeStack';
import { resetRepositoryChromeDismissStackForTests } from '../hooks/repositoryChromeDismiss';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { RepositoryRoom } from '@/app/services/repository/repositoryRooms';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: () => () => undefined,
}));

const room: RepositoryRoom = {
    id: 'room_ahmad',
    title: 'موكل أحمد',
    createdAt: '2026-01-01T00:00:00.000Z',
};

const vaultDoc: SmartVaultDoc = {
    id: 'v1',
    title: 'عقد إيجار',
    type: 'pdf',
    tags: [],
    authorId: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    fileSize: 1024,
    fileName: 'lease.pdf',
    mimeType: 'application/pdf',
    storagePath: 'local:vault:lease',
};

const note: GlobalNote = {
    id: 'n1',
    title: 'مسودة مرافعة',
    body: 'نص المسودة',
    isPinned: false,
    date: '2026-01-01',
    createdAtIso: '2026-01-01T00:00:00.000Z',
};

const cardHandlers = {
    lawsuitFiles: [] as never[],
    executionFiles: [] as never[],
    dossiers: [] as never[],
    vaultDocsById: new Map<string, SmartVaultDoc>(),
    onSaveGlobal: vi.fn(),
    onDeleteGlobal: vi.fn(),
    onUpdateLawsuit: vi.fn(),
    onUpdateExecution: vi.fn(),
    onLinkGlobalToDossier: async () => undefined,
    onBindVaultDoc: async () => undefined,
    onDeleteVaultDoc: vi.fn(),
    onEditVaultDoc: vi.fn(),
    onViewVaultDoc: vi.fn(),
};

function EscapeHarness({ onCloseModal }: { onCloseModal: () => void }) {
    useRepositoryEscapeStack({
        enabled: true,
        composing: false,
        scannerOpen: false,
        showVoiceRecorder: false,
        onResetComposer: () => undefined,
        onCloseScanner: () => undefined,
        onCloseModal,
    });
    return null;
}

describe('سيناريوهات المحامي في المستودع', () => {
    beforeEach(() => {
        resetRepositoryChromeDismissStackForTests();
        vi.clearAllMocks();
    });

    it('وثيقة PDF: زر النقل يظهر عندما توجد غرف', () => {
        render(
            <UniversalEntryCard
                {...cardHandlers}
                item={{ kind: 'vault_doc', doc: vaultDoc, sortKey: 1 }}
                rooms={[room]}
                onMoveVaultDocToRoom={vi.fn()}
            />,
        );
        expect(screen.getByTestId('repository-move-to-room')).toBeInTheDocument();
        expect(screen.getByTestId('repository-feed-vault-v1')).toHaveTextContent('عقد إيجار');
    });

    it('ملاحظة: زر النقل يظهر عندما توجد غرف', () => {
        render(
            <UniversalEntryCard
                {...cardHandlers}
                item={{ kind: 'global', note, sortKey: 1 }}
                rooms={[room]}
                onMoveGlobalToRoom={vi.fn()}
            />,
        );
        expect(screen.getByTestId('repository-move-to-room')).toBeInTheDocument();
        expect(screen.getByTestId('repository-feed-global-n1')).toHaveTextContent('مسودة مرافعة');
    });

    it('الخلاصة الفارغة: رسالة واحدة عند عدم وجود عناصر', () => {
        render(
            <RepositoryFeedPanel
                filter="all"
                items={[]}
                feedLayout="grid"
                layoutClass=""
                searchQuery=""
                lawsuitFiles={[]}
                executionFiles={[]}
                dossiers={[]}
                vaultDocsById={new Map()}
                onSaveGlobal={vi.fn()}
                onDeleteGlobal={vi.fn()}
                onUpdateLawsuit={vi.fn()}
                onUpdateExecution={vi.fn()}
                onLinkGlobalToDossier={async () => undefined}
                onBindVaultDoc={async () => undefined}
                onDeleteVaultDoc={vi.fn()}
                onEditVaultDoc={vi.fn()}
                onViewVaultDoc={vi.fn()}
            />,
        );
        expect(screen.getByTestId('repository-feed-empty-all')).toHaveTextContent('المستودع فارغ');
    });

    it('البحث بلا نتائج: رسالة بحث لا إفراغ عام', () => {
        render(
            <RepositoryFeedPanel
                filter="all"
                items={[]}
                feedLayout="grid"
                layoutClass=""
                searchQuery="لا يوجد"
                lawsuitFiles={[]}
                executionFiles={[]}
                dossiers={[]}
                vaultDocsById={new Map()}
                onSaveGlobal={vi.fn()}
                onDeleteGlobal={vi.fn()}
                onUpdateLawsuit={vi.fn()}
                onUpdateExecution={vi.fn()}
                onLinkGlobalToDossier={async () => undefined}
                onBindVaultDoc={async () => undefined}
                onDeleteVaultDoc={vi.fn()}
                onEditVaultDoc={vi.fn()}
                onViewVaultDoc={vi.fn()}
            />,
        );
        expect(screen.getByTestId('repository-feed-empty-all')).toHaveTextContent('لا توجد نتائج للبحث');
    });

    it('الخلاصة تمرّر النقل لبطاقة الوثيقة', () => {
        render(
            <RepositoryFeedPanel
                filter="all"
                items={[{ kind: 'vault_doc', doc: vaultDoc, sortKey: 1 }]}
                feedLayout="grid"
                layoutClass=""
                searchQuery=""
                lawsuitFiles={[]}
                executionFiles={[]}
                dossiers={[]}
                vaultDocsById={new Map()}
                rooms={[room]}
                onMoveVaultDocToRoom={vi.fn()}
                onSaveGlobal={vi.fn()}
                onDeleteGlobal={vi.fn()}
                onUpdateLawsuit={vi.fn()}
                onUpdateExecution={vi.fn()}
                onLinkGlobalToDossier={async () => undefined}
                onBindVaultDoc={async () => undefined}
                onDeleteVaultDoc={vi.fn()}
                onEditVaultDoc={vi.fn()}
                onViewVaultDoc={vi.fn()}
            />,
        );
        expect(screen.getByTestId('repository-move-to-room')).toBeInTheDocument();
    });

    it('Escape على قائمة الإضافة يبقي المستودع مفتوحاً', () => {
        const onCloseModal = vi.fn();
        const imageRef = React.createRef<HTMLInputElement>();
        const pdfRef = React.createRef<HTMLInputElement>();
        render(
            <>
                <EscapeHarness onCloseModal={onCloseModal} />
                <RepositoryAddMenu
                    onCreateNote={() => undefined}
                    onOpenScanner={() => undefined}
                    onOpenVoice={() => undefined}
                    imageInputRef={imageRef}
                    pdfInputRef={pdfRef}
                    onImageSelect={() => undefined}
                    onPdfSelect={() => undefined}
                />
            </>,
        );

        fireEvent.click(screen.getByTestId('repository-add-menu-trigger'));
        expect(screen.getByTestId('repository-add-menu-panel')).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'Escape', bubbles: true });
        expect(screen.queryByTestId('repository-add-menu-panel')).not.toBeInTheDocument();
        expect(onCloseModal).not.toHaveBeenCalled();
    });
});
