import React, { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { Mic, Save } from 'lucide-react';
import type { DossierNoteContext } from '@/app/services/dossier-notes/dossierLawArticleTooltips';
import { dossierNoteTimestampLabel } from '@/app/services/dossier-notes/dossierNoteTimestamp';
import {
    isVoiceBlobWithinLimit,
    isVoiceDurationValid,
    persistVoiceRecording,
} from '@/app/services/voice/voiceRecordingLimits';
import { voiceNoteTitleFromMeta } from '@/app/services/voice/voiceNoteCodec';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { createQuickNoteId, quickNoteTitle } from '@/app/components/lawyer/dashboard/quickNoteUtils';
import {
    DossierLawArticleRichEditor,
    type DossierLawArticleRichEditorHandle,
} from './DossierLawArticleRichEditor';
import { REPO_BTN_GOLD, REPO_INPUT } from '@/app/components/lawyer/SmartRepository/smartRepositoryTheme';

const VoiceRecorderModal = lazy(() => import('@/app/components/lawyer/ActionModals/VoiceRecorderModal').then(mod => ({ default: mod.VoiceRecorderModal })));
const VoiceRecorderErrorBoundary = lazy(() => import('@/app/components/lawyer/ActionModals/VoiceRecorderErrorBoundary').then(mod => ({ default: mod.VoiceRecorderErrorBoundary })));

type DossierFastNoteComposerProps = {
    title: string;
    onTitleChange: (value: string) => void;
    bodyHtml: string;
    onBodyChange: (html: string) => void;
    context: DossierNoteContext;
    onSave: (payload: { title: string; bodyHtml: string }) => void;
    onCancel?: () => void;
    saveLabel?: string;
    voiceUserId?: string;
    onVoiceNote?: (payload: { title: string; body: string }) => void;
    expanded?: boolean;
    showTitle?: boolean;
    saving?: boolean;
};

export function DossierFastNoteComposer({
    title,
    onTitleChange,
    bodyHtml,
    onBodyChange,
    context,
    onSave,
    onCancel,
    saveLabel = 'حفظ الملاحظة',
    voiceUserId,
    onVoiceNote,
    expanded = true,
    showTitle = true,
    saving = false,
}: DossierFastNoteComposerProps) {
    const editorRef = useRef<DossierLawArticleRichEditorHandle>(null);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const [voiceRecorderKey, setVoiceRecorderKey] = useState(0);
    const [openedAt] = useState(() => dossierNoteTimestampLabel());

    const prependStamp = useCallback(
        (html: string) => {
            const trimmed = html.trim();
            if (!trimmed || trimmed.includes('data-dossier-note-stamp')) return html;
            return `<p data-dossier-note-stamp="1" class="text-white/45 text-[11px] select-none">${openedAt}</p>${html}`;
        },
        [openedAt],
    );

    const handleSave = useCallback(() => {
        const latest = prependStamp(editorRef.current?.getHtml() ?? bodyHtml);
        if (latest !== bodyHtml) onBodyChange(latest);
        onSave({ title: title.trim() || 'ملاحظة', bodyHtml: latest });
    }, [bodyHtml, onBodyChange, onSave, prependStamp, title]);

    const handleVoiceSave = useCallback(
        async (payload: { blob: Blob; durationSeconds: number; transcript?: string }) => {
            if (!onVoiceNote) return;
            if (!isRealSignedIn(voiceUserId)) {
                SmartToast.error('يرجى تسجيل الدخول أولاً لاستخدام التسجيل الصوتي');
                return;
            }
            if (!isVoiceDurationValid(payload.durationSeconds) || !isVoiceBlobWithinLimit(payload.blob.size)) {
                SmartToast.error('التسجيل غير صالح');
                return;
            }
            try {
                const noteId = createQuickNoteId();
                const { body } = await persistVoiceRecording(noteId, payload.blob);
                const voiceTitle = voiceNoteTitleFromMeta({
                    transcript: payload.transcript,
                    durationSec: payload.durationSeconds,
                    fallback: quickNoteTitle('voice'),
                });
                const stampedBody = prependStamp(body);
                onVoiceNote({ title: voiceTitle, body: stampedBody });
                setShowVoiceRecorder(false);
                SmartToast.success('تم حفظ التسجيل الصوتي في الملاحظة');
            } catch {
                SmartToast.error('تعذّر حفظ التسجيل');
            }
        },
        [onVoiceNote, prependStamp, voiceUserId],
    );

    return (
        <div className="space-y-3" data-testid="dossier-fast-note-composer">
            <p className="text-[11px] text-white/45 select-none" aria-live="polite">
                {openedAt}
            </p>
            {showTitle ? (
                <input
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="عنوان مختصر (اختياري)"
                    className={REPO_INPUT}
                    data-testid="dossier-note-title"
                />
            ) : null}
            <DossierLawArticleRichEditor
                ref={editorRef}
                value={bodyHtml}
                onChange={onBodyChange}
                context={context}
                expanded={expanded}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" dir="rtl">
                {onVoiceNote ? (
                    <button
                        type="button"
                        onClick={() => {
                            setVoiceRecorderKey((k) => k + 1);
                            setShowVoiceRecorder(true);
                        }}
                        className={`${REPO_BTN_GOLD} min-h-[48px] w-full justify-center whitespace-nowrap`}
                        data-testid="dossier-note-voice"
                    >
                        <Mic size={16} />
                        تسجيل صوتي
                    </button>
                ) : null}
                <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className={`${REPO_BTN_GOLD} min-h-[48px] w-full justify-center whitespace-nowrap`}
                    data-testid="dossier-note-save"
                >
                    <Save size={16} />
                    {saveLabel}
                </button>
                {onCancel ? (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="min-h-[48px] w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-white/80 transition-all hover:bg-white/[0.08] hover:text-white whitespace-nowrap"
                    >
                        إلغاء
                    </button>
                ) : null}
            </div>
            {showVoiceRecorder && onVoiceNote ? (
                <Suspense fallback={null}>
                    <VoiceRecorderErrorBoundary onClose={() => setShowVoiceRecorder(false)}>
                        <VoiceRecorderModal
                            key={voiceRecorderKey}
                            onClose={() => setShowVoiceRecorder(false)}
                            onSaveVoice={(payload) => void handleVoiceSave(payload)}
                        />
                    </VoiceRecorderErrorBoundary>
                </Suspense>
            ) : null}
        </div>
    );
}
