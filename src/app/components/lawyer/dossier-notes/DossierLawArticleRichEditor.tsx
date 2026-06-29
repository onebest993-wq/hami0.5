import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import {
    decorateLawArticlesInHtml,
    isSmartLawLinksEnabled,
    normalizeSmartLawLinkHtml,
    type DossierNoteContext,
} from '@/app/services/dossier-notes/smartLawLinker';
import { LegalRichTextEditor, type LegalRichTextEditorHandle } from '@/app/components/lawyer/SmartRepository/LegalRichTextEditor';
import { sanitizeRichNoteHtml } from '@/app/components/lawyer/SmartRepository/legalRichTextEditorUtils';
import { SmartLawLinkPopover } from './SmartLawLinkPopover';
import { SmartLawPickerMenu } from './SmartLawPickerMenu';
import { useSmartLawLinkInteractions } from './useSmartLawLinkInteractions';

export type DossierLawArticleRichEditorHandle = {
    getHtml: () => string;
};

type DossierLawArticleRichEditorProps = {
    value: string;
    onChange: (html: string) => void;
    context: DossierNoteContext;
    placeholder?: string;
    expanded?: boolean;
    testId?: string;
};

const DECORATE_DEBOUNCE_MS = 650;

export const DossierLawArticleRichEditor = forwardRef<
    DossierLawArticleRichEditorHandle,
    DossierLawArticleRichEditorProps
>(function DossierLawArticleRichEditor(
    { value, onChange, context, placeholder, expanded = true, testId = 'dossier-note-editor' },
    ref,
) {
    const innerRef = useRef<LegalRichTextEditorHandle>(null);
    const decorateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lawLinksEnabled = isSmartLawLinksEnabled(context);

    const emitSanitized = useCallback(
        (html: string) => {
            onChange(sanitizeRichNoteHtml(normalizeSmartLawLinkHtml(html)));
        },
        [onChange],
    );

    const runDecorate = useCallback(() => {
        if (!lawLinksEnabled) return;
        const raw = innerRef.current?.getHtml() ?? value;
        const decorated = decorateLawArticlesInHtml(raw, context);
        if (decorated !== raw) emitSanitized(decorated);
    }, [context, emitSanitized, lawLinksEnabled, value]);

    const scheduleDecorate = useCallback(() => {
        if (!lawLinksEnabled) return;
        if (decorateTimer.current) clearTimeout(decorateTimer.current);
        decorateTimer.current = setTimeout(() => {
            decorateTimer.current = null;
            runDecorate();
        }, DECORATE_DEBOUNCE_MS);
    }, [lawLinksEnabled, runDecorate]);

    useEffect(
        () => () => {
            if (decorateTimer.current) clearTimeout(decorateTimer.current);
        },
        [],
    );

    const {
        tooltip,
        picker,
        pinned,
        closeAll,
        handleMouseOver,
        handleMouseLeave,
        handleClick,
        handlePickLaw,
    } = useSmartLawLinkInteractions(context, { onLinkAssigned: runDecorate });

    useImperativeHandle(
        ref,
        () => ({
            getHtml: () =>
                sanitizeRichNoteHtml(
                    normalizeSmartLawLinkHtml(innerRef.current?.getHtml() ?? value),
                ),
        }),
        [value],
    );

    const handleChange = useCallback(
        (html: string) => {
            emitSanitized(html);
            scheduleDecorate();
        },
        [emitSanitized, scheduleDecorate],
    );

    const handleBlur = useCallback(() => {
        if (!lawLinksEnabled) return;
        if (decorateTimer.current) {
            clearTimeout(decorateTimer.current);
            decorateTimer.current = null;
        }
        runDecorate();
    }, [lawLinksEnabled, runDecorate]);

    const editor = (
        <LegalRichTextEditor
            ref={innerRef}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            expanded={expanded}
            testId={testId}
        />
    );

    if (!lawLinksEnabled) {
        return editor;
    }

    return (
        <div
            className="relative"
            onMouseOver={handleMouseOver}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            {editor}
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
});
