import React, { useMemo } from 'react';
import { isVoiceNoteBody } from '@/app/components/lawyer/dashboard/notepadNoteUtils';
import { VoiceNoteAudio } from '@/app/components/lawyer/dashboard/VoiceNoteAudio';
import { sanitizeRichNoteHtml } from '@/app/components/lawyer/SmartRepository/legalRichTextEditorUtils';
import type { DossierNoteContext } from '@/app/services/dossier-notes/smartLawLinker';
import { isSmartLawLinksEnabled } from '@/app/services/dossier-notes/smartLawLinker';
import { SmartLawLinkPopover } from './SmartLawLinkPopover';
import { SmartLawPickerMenu } from './SmartLawPickerMenu';
import { useSmartLawLinkInteractions } from './useSmartLawLinkInteractions';
import { stripRepositoryHtml } from '@/app/services/repository/stripRepositoryHtml';
import { sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';

type DossierNoteBodyPreviewProps = {
    body: string;
    className?: string;
    /** سياق القانون لجلب نص المادة عند Hover */
    lawContext?: DossierNoteContext;
};

export function DossierNoteBodyPreview({
    body,
    className = '',
    lawContext = { kind: 'repository' },
}: DossierNoteBodyPreviewProps) {
    // XSS L5 Safe: stripRepositoryHtml(phase0+phase1) + sanitizeProfilePlainText before render
    const phaseCleanedBody = sanitizeProfilePlainText(stripRepositoryHtml(body ?? ''), 20000);
    const safeHtml = useMemo(() => sanitizeRichNoteHtml(phaseCleanedBody), [phaseCleanedBody]);
    const isRich = /<[a-z][\s\S]*>/i.test(body);

    const lawLinksEnabled = isSmartLawLinksEnabled(lawContext);

    const {
        tooltip,
        picker,
        pinned,
        closeAll,
        handleMouseOver,
        handleMouseLeave,
        handleClick,
        handlePickLaw,
    } = useSmartLawLinkInteractions(lawContext, { readOnly: true });

    if (isVoiceNoteBody(body)) {
        return (
            <div className={className}>
                <VoiceNoteAudio body={body} />
            </div>
        );
    }

    if (isRich) {
        const previewBody = (
            <div
                className="text-gray-500 text-[10px] leading-relaxed break-words dossier-note-preview"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
        );

        if (!lawLinksEnabled) {
            return <div className={className}>{previewBody}</div>;
        }

        return (
            <div
                className={`relative ${className}`}
                onMouseOver={handleMouseOver}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
            >
                {previewBody}
                {tooltip ? (
                    <SmartLawLinkPopover
                        x={tooltip.x}
                        y={tooltip.y}
                        loading={tooltip.loading}
                        article={tooltip.article}
                        lawId={tooltip.lawId}
                        articleNum={tooltip.articleNum}
                        pinned={pinned}
                        onClose={closeAll}
                    />
                ) : null}
                {picker ? (
                    <SmartLawPickerMenu
                        x={picker.x}
                        y={picker.y}
                        articleNum={picker.articleNum}
                        onPick={handlePickLaw}
                        onClose={closeAll}
                    />
                ) : null}
            </div>
        );
    }

    return (
        <p className={`text-gray-500 text-[10px] leading-relaxed whitespace-pre-line break-words ${className}`}>
            {body}
        </p>
    );
}
