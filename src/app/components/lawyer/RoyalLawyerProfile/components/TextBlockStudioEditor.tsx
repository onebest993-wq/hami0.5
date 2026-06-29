import React, { useEffect, useState } from 'react';
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

export function TextBlockStudioEditor({
    block,
    onChange,
    uploadingCanvasBg,
    onUploadCanvasBg,
}: TextBlockStudioEditorProps) {
    const [panel, setPanel] = useState<StudioPanel>('style');
    const [scope, setScope] = useState<TextStyleScope>('all');
    const [lineIndex, setLineIndex] = useState(0);
    const [phraseRange, setPhraseRange] = useState<{ start: number; end: number } | null>(null);

    const lines = (block.body ?? '').split('\n');

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
                value={block.body ?? ''}
                onChange={(e) => {
                    const body = e.target.value;
                    const lineCount = body.split('\n').length;
                    onChange({
                        body,
                        lineStyles: block.lineStyles?.slice(0, lineCount),
                        textSpans: block.textSpans?.filter((s) => s.lineIndex < lineCount),
                    });
                }}
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
                    block={block}
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
}
