import React, { lazy, Suspense } from 'react';
import { Loader2 } from '@/app/components/ui/lucideIcons';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { DossierLawArticleRichEditorHandle } from '@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor';

/**
 * لوحات ثقيلة — lazy معزول داخل Suspense محلي.
 * لا تُسحَب إلى chunk المستودع الأساسي عند أول paint.
 */
const LazyDossierLawArticleRichEditor = lazy(() =>
    import('@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor').then((m) => ({
        default: m.DossierLawArticleRichEditor,
    })),
);

const LazySmartVaultScannerPanel = lazy(() =>
    import('@/app/components/lawyer/SmartVaultModal/SmartVaultScannerPanel').then((m) => ({
        default: m.SmartVaultScannerPanel,
    })),
);

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
    compact?: boolean;
};

export function RepositoryRichEditor({
    editorRef,
    value,
    onChange,
    compact = true,
}: RepositoryRichEditorProps) {
    return (
        <Suspense fallback={<PanelFallback />}>
            <LazyDossierLawArticleRichEditor
                ref={editorRef}
                value={value}
                onChange={onChange}
                context={{ kind: 'repository' }}
                testId="repository-rich-editor"
                compact={compact}
                expanded={!compact}
            />
        </Suspense>
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
    return (
        <Suspense fallback={<PanelFallback />}>
            <LazySmartVaultScannerPanel {...props} />
        </Suspense>
    );
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
            <LazyVoiceRecorderModal
                key={recorderKey}
                onClose={onClose}
                onSaveVoice={onSaveVoice}
            />
        </Suspense>
    );
}

export type { SmartVaultDoc };
