import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ensureProfileCanvasFxLoadedSync } from '@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader';
import { scheduleDeferredGoogleFonts } from '@/app/runtime/deferredGoogleFonts';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { TextBlockCanvasPanel } from './textStudio/TextBlockCanvasPanel';
import { TextBlockInteractionPanel } from './textStudio/TextBlockInteractionPanel';
import { TextBlockStylePanel } from './textStudio/TextBlockStylePanel';
import type { TextStyleScope } from './textStudio/patchTextBlockStyle';

type StudioPanel = 'style' | 'canvas' | 'interaction';

type TextBlockStudioEditorProps = {
    block: ProfileCustomBlock;
    onChange: (patch: Partial<ProfileCustomBlock>) => void;
    uploadingCanvasBg?: boolean;
    onUploadCanvasBg?: () => void;
};

const PANELS: { id: StudioPanel; label: string; testId: string }[] = [
    { id: 'style', label: 'تنسيق النص', testId: 'text-studio-tab-style' },
    { id: 'canvas', label: 'لوحة الكتابة', testId: 'text-studio-tab-canvas' },
    { id: 'interaction', label: 'التفاعل', testId: 'text-studio-tab-interaction' },
];

const TEXT_BODY_COMMIT_DELAY_MS = 140;

export const TextBlockStudioEditor = React.memo(function TextBlockStudioEditor({
    block,
    onChange,
    uploadingCanvasBg,
    onUploadCanvasBg,
}: TextBlockStudioEditorProps) {
    const [panel, setPanel] = useState<StudioPanel>('style');
    const [scope, setScope] = useState<TextStyleScope>('all');
    const [lineIndex, setLineIndex] = useState(0);
    const [phraseRange, setPhraseRange] = useState<{ start: number; end: number } | null>(null);
    const [bodyDraft, setBodyDraft] = useState(block.body ?? '');
    const bodyCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const bodyDraftRef = useRef(block.body ?? '');
    const blockRef = useRef(block);
    const onChangeRef = useRef(onChange);

    blockRef.current = block;
    bodyDraftRef.current = bodyDraft;
    onChangeRef.current = onChange;

    const lines = useMemo(() => bodyDraft.split('\n'), [bodyDraft]);

    useEffect(() => {
        const nextBody = block.body ?? '';
        bodyDraftRef.current = nextBody;
        setBodyDraft(nextBody);
    }, [block.id, block.body]);

    const commitBody = useCallback(
        (body: string) => {
            const current = blockRef.current;
            const lineCount = body.split('\n').length;
            onChangeRef.current({
                body,
                lineStyles: current.lineStyles?.slice(0, lineCount),
                textSpans: current.textSpans?.filter((s) => s.lineIndex < lineCount),
            });
        },
        [],
    );

    const flushPendingBody = useCallback(() => {
        if (bodyCommitTimerRef.current) {
            clearTimeout(bodyCommitTimerRef.current);
            bodyCommitTimerRef.current = null;
        }
        commitBody(bodyDraft);
    }, [bodyDraft, commitBody]);

    useEffect(
        () => () => {
            if (bodyCommitTimerRef.current) {
                clearTimeout(bodyCommitTimerRef.current);
                commitBody(bodyDraftRef.current);
            }
        },
        [commitBody],
    );

    useEffect(() => {
        ensureProfileCanvasFxLoadedSync({
            includeStudio: true,
            interaction: block.canvasStyle?.interaction ?? 'none',
        });
        scheduleDeferredGoogleFonts();
    }, [block.canvasStyle?.interaction]);

    return (
        <div className="space-y-3" data-testid="text-block-studio-editor">
            <textarea
                value={bodyDraft}
                onChange={(e) => {
                    const body = e.target.value;
                    bodyDraftRef.current = body;
                    setBodyDraft(body);
                    if (bodyCommitTimerRef.current) clearTimeout(bodyCommitTimerRef.current);
                    bodyCommitTimerRef.current = setTimeout(() => {
                        bodyCommitTimerRef.current = null;
                        commitBody(body);
                    }, TEXT_BODY_COMMIT_DELAY_MS);
                }}
                onBlur={flushPendingBody}
                rows={5}
                className="w-full bg-black/35 border border-white/10 rounded-xl px-3 py-3 text-sm outline-none resize-y focus:border-white/20 leading-relaxed"
                placeholder="اكتب نصك — كل سطر مستقل، ويمكن تلوين كلمة أو سطر أو الكل"
                data-testid="text-block-body-input"
            />

            <div className="profile-studio-panel-tabs">
                {PANELS.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        data-active={panel === p.id ? 'true' : 'false'}
                        data-testid={p.testId}
                        className="profile-studio-panel-tab min-h-[44px]"
                        onClick={() => setPanel(p.id)}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {panel === 'style' ? (
                <TextBlockStylePanel
                    block={{ ...block, body: bodyDraft }}
                    scope={scope}
                    lineIndex={lineIndex}
                    phraseRange={phraseRange}
                    lines={lines}
                    onScopeChange={setScope}
                    onLineIndexChange={setLineIndex}
                    onPhraseRangeChange={setPhraseRange}
                    onChange={onChange}
                />
            ) : null}

            {panel === 'canvas' ? (
                <TextBlockCanvasPanel
                    block={block}
                    uploadingCanvasBg={uploadingCanvasBg}
                    onChange={onChange}
                    onUploadCanvasBg={onUploadCanvasBg}
                />
            ) : null}

            {panel === 'interaction' ? (
                <TextBlockInteractionPanel block={block} onChange={onChange} />
            ) : null}
        </div>
    );
});
