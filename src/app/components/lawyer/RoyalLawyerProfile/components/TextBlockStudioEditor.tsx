import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scheduleDeferredGoogleFonts } from '@/app/runtime/deferredGoogleFonts';
import { isAndroidNativeShell } from '@/app/runtime/nativePlatform';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { TextBlockCanvasPanel } from './textStudio/TextBlockCanvasPanel';
import { TextBlockStylePanel } from './textStudio/TextBlockStylePanel';
import type { TextStyleScope } from './textStudio/patchTextBlockStyle';
import { isPrimaryDragPointer } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';

type StudioPanel = 'style' | 'canvas';

type TextBlockStudioEditorProps = {
    block: ProfileCustomBlock;
    onChange: (patch: Partial<ProfileCustomBlock>) => void;
    uploadingCanvasBg?: boolean;
    saving?: boolean;
    onUploadCanvasBg?: () => void;
    onClearCanvasBg?: () => void;
};

const PANELS: { id: StudioPanel; label: string; testId: string }[] = [
    { id: 'style', label: 'النص', testId: 'text-studio-tab-style' },
    { id: 'canvas', label: 'الإطار', testId: 'text-studio-tab-canvas' },
];

/**
 * محرر نص خفيف: تنسيق + إطار فقط.
 * تفاعلات الكشف الثقيلة (ستارة/غبار…) أُزيلت من الاستوديو لأنها تثقل المعاينة والجهاز.
 * النص يُثبَّت فوراً في المسودة — لا debounce يسبق «حفظ» ويفقد آخر الأحرف.
 */
export const TextBlockStudioEditor = React.memo(function TextBlockStudioEditor({
    block,
    onChange,
    uploadingCanvasBg,
    saving = false,
    onUploadCanvasBg,
    onClearCanvasBg,
}: TextBlockStudioEditorProps) {
    const [panel, setPanel] = useState<StudioPanel>('style');
    const [scope, setScope] = useState<TextStyleScope>('all');
    const [lineIndex, setLineIndex] = useState(0);
    const [phraseRange, setPhraseRange] = useState<{ start: number; end: number } | null>(null);
    const [bodyDraft, setBodyDraft] = useState(block.body ?? '');
    const bodyDraftRef = useRef(block.body ?? '');
    const blockRef = useRef(block);
    const onChangeRef = useRef(onChange);
    const armedPanelRef = useRef<StudioPanel | null>(null);

    blockRef.current = block;
    bodyDraftRef.current = bodyDraft;
    onChangeRef.current = onChange;

    const lines = useMemo(() => bodyDraft.split('\n'), [bodyDraft]);

    /* تبديل البلوك فقط — لا تُصفَّر فهرس السطر عند كل حرف في body */
    useEffect(() => {
        const nextBody = block.body ?? '';
        bodyDraftRef.current = nextBody;
        setBodyDraft(nextBody);
        setPhraseRange(null);
        setLineIndex(0);
        setScope('all');
    }, [block.id]);

    useEffect(() => {
        const nextBody = block.body ?? '';
        if (nextBody === bodyDraftRef.current) return;
        bodyDraftRef.current = nextBody;
        setBodyDraft(nextBody);
        setPhraseRange(null);
    }, [block.body]);

    useEffect(() => {
        setLineIndex((idx) => Math.min(idx, Math.max(0, lines.length - 1)));
    }, [lines.length]);

    const activatePanel = useCallback((next: StudioPanel) => {
        setPanel((curr) => (curr === next ? curr : next));
    }, []);

    useEffect(() => {
        if (panel !== 'style') return;
        if (!isAndroidNativeShell()) {
            scheduleDeferredGoogleFonts();
        }
    }, [panel]);

    const styleBlock = useMemo(() => ({ ...block, body: bodyDraft }), [block, bodyDraft]);

    return (
        <div className="profile-studio-editor" data-testid="text-block-studio-editor">
            <textarea
                value={bodyDraft}
                maxLength={2000}
                onChange={(e) => {
                    const body = e.target.value.slice(0, 2000);
                    bodyDraftRef.current = body;
                    setBodyDraft(body);
                    if (body !== (blockRef.current.body ?? '')) {
                        onChangeRef.current({ body });
                    }
                }}
                rows={4}
                className="profile-studio-body-input"
                placeholder="اكتب النص هنا…"
                data-testid="text-block-body-input"
            />

            <div className="profile-studio-panel-tabs" role="tablist" aria-label="أقسام تحرير النص">
                {PANELS.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        role="tab"
                        aria-selected={panel === p.id}
                        data-active={panel === p.id ? 'true' : 'false'}
                        data-testid={p.testId}
                        className="profile-studio-panel-tab min-h-[44px] touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                        onPointerDown={(event) => {
                            if (!isPrimaryDragPointer(event)) return;
                            event.stopPropagation();
                            /* لا preventDefault — على Android يمرّر click لاحقاً ويغلق الورقة */
                            if (event.pointerType === 'touch' || event.pointerType === 'pen') {
                                armedPanelRef.current = p.id;
                                activatePanel(p.id);
                            }
                        }}
                        onClick={(event) => {
                            event.stopPropagation();
                            if (armedPanelRef.current === p.id) {
                                armedPanelRef.current = null;
                                return;
                            }
                            activatePanel(p.id);
                        }}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <div className="profile-studio-panel-slot" role="tabpanel">
                {panel === 'style' ? (
                    <TextBlockStylePanel
                        block={styleBlock}
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
                        block={styleBlock}
                        uploadingCanvasBg={Boolean(uploadingCanvasBg || saving)}
                        onChange={onChange}
                        onUploadCanvasBg={onUploadCanvasBg}
                        onClearCanvasBg={onClearCanvasBg}
                    />
                ) : null}
            </div>
        </div>
    );
});
