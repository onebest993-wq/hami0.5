import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { DossierLawArticleRichEditorHandle } from '@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor';
import { DossierLawArticleRichEditor } from '@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor';
import { SmartVaultScannerPanel } from '@/app/components/lawyer/SmartVaultModal/SmartVaultScannerPanel';

const LazyVoiceRecorderModal = lazy(() =>
    import('@/app/components/lawyer/ActionModals/VoiceRecorderModal').then((m) => ({
        default: m.VoiceRecorderModal,
    })),
);

function PanelFallback() {
    return (
        <div className="flex items-center justify-center py-8" aria-busy="true">
            <Loader2 size={24} className="text-[#E6C673] animate-spin" />
        </div>
    );
}

type RepositoryRichEditorProps = {
    editorRef: React.RefObject<DossierLawArticleRichEditorHandle | null>;
    value: string;
    onChange: (html: string) => void;
};

export function RepositoryRichEditor({ editorRef, value, onChange }: RepositoryRichEditorProps) {
    return (
        <DossierLawArticleRichEditor
            ref={editorRef}
            value={value}
            onChange={onChange}
            context={{ kind: 'repository' }}
            testId="repository-rich-editor"
        />
    );
}

type RepositoryScannerPanelProps = {
    userId: string;
    onClose: () => void;
    onSaved: (result: import('@/app/components/lawyer/SmartVaultModal/SmartVaultScannerPanel').ScannerSaveResult) => void;
    onViewDoc: (doc: import('@/app/services/vault/vaultTypes').SmartVaultDoc) => void;
    onCategoryUsed: (name: string) => void;
    categorySuggestions: string[];
};

export function RepositoryScannerPanel(props: RepositoryScannerPanelProps) {
    return <SmartVaultScannerPanel {...props} />;
}

type RepositoryVoiceRecorderProps = {
    recorderKey: number;
    onClose: () => void;
    onSaveVoice: (payload: Parameters<
        typeof import('@/app/components/lawyer/dashboard/notepadVoiceSave').saveVoiceNoteToNotepad
    >[0]) => void | Promise<void>;
};

export function RepositoryVoiceRecorder({
    recorderKey,
    onClose,
    onSaveVoice,
}: RepositoryVoiceRecorderProps) {
    return (
        <Suspense fallback={<PanelFallback />}>
            <LazyVoiceRecorderModal key={recorderKey} onClose={onClose} onSaveVoice={onSaveVoice} />
        </Suspense>
    );
}

export type { SmartVaultDoc };
