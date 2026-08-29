import React, { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { Mic } from '@/app/components/ui/icons/Mic';
import { Save } from '@/app/components/ui/icons/Save';
import type { DossierNoteContext } from '@/app/services/dossier-notes/smartLawLinker';
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
import {
    REPO_COMPOSE_CANCEL,
    REPO_COMPOSE_FOOTER,
    REPO_COMPOSE_ICON_BTN,
    REPO_COMPOSE_META,
    REPO_COMPOSE_SAVE,
    REPO_COMPOSE_SHELL,
    REPO_COMPOSE_TITLE,
} from '@/app/components/lawyer/SmartRepository/smartRepositoryTheme';

const VoiceRecorderModal = lazy(() =>
    import('@/app/components/lawyer/ActionModals/VoiceRecorderModal').then((mod) => ({
        default: mod.VoiceRecorderModal,
    })),
);
const VoiceRecorderErrorBoundary = lazy(() =>
    import('@/app/components/lawyer/ActionModals/VoiceRecorderErrorBoundary').then((mod) => ({
        default: mod.VoiceRecorderErrorBoundary,
    })),
);

function VoiceRecorderLoadingFallback({ onClose }: { onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[280] flex items-center justify-center bg-[#080f18]/90 backdrop-blur-sm p-4"
            role="status"
            aria-live="polite"
            data-testid="voice-recorder-loading"
        >
            <div className="w-full max-w-sm rounded-2xl border border-[#E6C673]/25 bg-[#0E1B2E] px-5 py-6 text-center shadow-2xl">
                <p className="text-sm font-bold text-[#E6C673]">جاري فتح المسجل الصوتي…</p>
                <button
                    type="button"
                    onClick={onClose}
                    className="mt-4 min-h-[44px] w-full rounded-xl border border-white/15 bg-white/[0.04] text-sm font-bold text-white/70 hover:bg-white/[0.08]"
                >
                    إلغاء
                </button>
            </div>
        </div>
    );
}

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
    /** وضع footer ثابت: محرّر مصغّر + مايكروفون أيقونة + حفظ يتفعّل فقط عند وجود نص */
    compact?: boolean;
};

/** هل يحتوي HTML الملاحظة على نص فعلي (متجاهلاً ختم التوقيت والوسوم)؟ */
function richHtmlHasText(html: string): boolean {
    return (
        html
            .replace(/<p[^>]*data-dossier-note-stamp[^>]*>.*?<\/p>/gi, '')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .trim().length > 0
    );
}

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
    compact = false,
}: DossierFastNoteComposerProps) {
    const editorRef = useRef<DossierLawArticleRichEditorHandle>(null);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const [voiceRecorderKey, setVoiceRecorderKey] = useState(0);
    const [openedAt] = useState(() => dossierNoteTimestampLabel());

    React.useEffect(() => {
        // Prefetch so the voice button opens immediately instead of a dead click.
        void import('@/app/components/lawyer/ActionModals/VoiceRecorderModal');
        void import('@/app/components/lawyer/ActionModals/VoiceRecorderErrorBoundary');
    }, []);

    const openVoiceRecorder = useCallback(() => {
        if (!onVoiceNote) {
            SmartToast.error('التسجيل الصوتي غير متاح هنا');
            return;
        }
        if (!isRealSignedIn(voiceUserId)) {
            SmartToast.error('يرجى تسجيل الدخول أولاً لاستخدام التسجيل الصوتي');
            return;
        }
        setVoiceRecorderKey((k) => k + 1);
        setShowVoiceRecorder(true);
    }, [onVoiceNote, voiceUserId]);

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

    const hasContent = richHtmlHasText(bodyHtml) || title.trim().length > 0;

    const voiceRecorderPortal =
        showVoiceRecorder && onVoiceNote ? (
            <Suspense fallback={<VoiceRecorderLoadingFallback onClose={() => setShowVoiceRecorder(false)} />}>
                <VoiceRecorderErrorBoundary onClose={() => setShowVoiceRecorder(false)}>
                    <VoiceRecorderModal
                        key={voiceRecorderKey}
                        onClose={() => setShowVoiceRecorder(false)}
                        onSaveVoice={(payload) => void handleVoiceSave(payload)}
                    />
                </VoiceRecorderErrorBoundary>
            </Suspense>
        ) : null;

    if (compact) {
        return (
            <div className={`${REPO_COMPOSE_SHELL} mb-0`} data-testid="dossier-fast-note-composer">
                {showTitle ? (
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        placeholder="عنوان مختصر (اختياري)"
                        className={REPO_COMPOSE_TITLE}
                        data-testid="dossier-note-title"
                        aria-label="عنوان الملاحظة"
                    />
                ) : null}
                <DossierLawArticleRichEditor
                    ref={editorRef}
                    value={bodyHtml}
                    onChange={onBodyChange}
                    context={context}
                    compact
                    expanded={false}
                />
                <footer className={REPO_COMPOSE_FOOTER}>
                    <div className="flex items-center gap-1.5 min-w-0">
                        {onVoiceNote ? (
                            <button
                                type="button"
                                onClick={openVoiceRecorder}
                                className={REPO_COMPOSE_ICON_BTN}
                                data-testid="dossier-note-voice"
                                aria-label="تسجيل صوتي"
                                title="تسجيل صوتي"
                            >
                                <Mic size={16} aria-hidden />
                            </button>
                        ) : null}
                    </div>
                    <div className="flex flex-1 items-center justify-end gap-1.5 min-w-0">
                        {onCancel ? (
                            <button type="button" onClick={onCancel} className={REPO_COMPOSE_CANCEL}>
                                إلغاء
                            </button>
                        ) : null}
                        <button
                            type="button"
                            disabled={saving || !hasContent}
                            onClick={handleSave}
                            className={REPO_COMPOSE_SAVE}
                            data-testid="dossier-note-save"
                        >
                            <Save size={14} aria-hidden />
                            {saveLabel}
                        </button>
                    </div>
                </footer>
                {voiceRecorderPortal}
            </div>
        );
    }

    return (
        <div className={`${REPO_COMPOSE_SHELL} mb-0`} data-testid="dossier-fast-note-composer">
            <div className="flex items-center justify-between gap-2">
                <span className={REPO_COMPOSE_META}>ملاحظة جديدة</span>
                <time className={REPO_COMPOSE_META} aria-live="polite">
                    {openedAt}
                </time>
            </div>
            {showTitle ? (
                <input
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="عنوان مختصر (اختياري)"
                    className={REPO_COMPOSE_TITLE}
                    data-testid="dossier-note-title"
                    aria-label="عنوان الملاحظة"
                />
            ) : null}
            <DossierLawArticleRichEditor
                ref={editorRef}
                value={bodyHtml}
                onChange={onBodyChange}
                context={context}
                compact
                expanded={false}
            />
            <footer className={REPO_COMPOSE_FOOTER}>
                <div className="flex items-center gap-1.5 min-w-0">
                    {onVoiceNote ? (
                        <button
                            type="button"
                            onClick={openVoiceRecorder}
                            className={REPO_COMPOSE_ICON_BTN}
                            data-testid="dossier-note-voice"
                            aria-label="تسجيل صوتي"
                            title="تسجيل صوتي"
                        >
                            <Mic size={16} aria-hidden />
                        </button>
                    ) : null}
                </div>
                <div className="flex flex-1 items-center justify-end gap-1.5 min-w-0">
                    {onCancel ? (
                        <button type="button" onClick={onCancel} className={REPO_COMPOSE_CANCEL}>
                            إلغاء
                        </button>
                    ) : null}
                    <button
                        type="button"
                        disabled={saving}
                        onClick={handleSave}
                        className={REPO_COMPOSE_SAVE}
                        data-testid="dossier-note-save"
                    >
                        <Save size={14} aria-hidden />
                        {saveLabel}
                    </button>
                </div>
            </footer>
            {voiceRecorderPortal}
        </div>
    );
}
