import { useCallback, useEffect, useRef, useState } from 'react';
import type { DossierNoteContext } from '@/app/services/dossier-notes/smartLawLinker';
import {
    assignSmartLawIdToElement,
    isSmartLawLinksEnabled,
    readSmartLawLinkFromElement,
    resolveDefaultSmartLawId,
    type SmartLawId,
} from '@/app/services/dossier-notes/smartLawLinker';
import {
    fallbackLawSummary,
    fetchSmartLawArticle,
    prefetchSmartLawArticlesForContext,
    type ResolvedSmartLawArticle,
} from '@/app/services/dossier-notes/smartLawArticleResolver';

type TooltipState = {
    x: number;
    y: number;
    lawId: SmartLawId | null;
    articleNum: number;
    loading: boolean;
    article: ResolvedSmartLawArticle | null;
};

type PickerState = {
    x: number;
    y: number;
    articleNum: number;
    target: HTMLElement;
};

function findSmartLawLinkTarget(node: EventTarget | null): HTMLElement | null {
    return (node as HTMLElement | null)?.closest('.smart-law-link, [data-law-article]') as HTMLElement | null;
}

export function useSmartLawLinkInteractions(
    context: DossierNoteContext,
    options?: { onLinkAssigned?: () => void; readOnly?: boolean },
) {
    const enabled = isSmartLawLinksEnabled(context);
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const [picker, setPicker] = useState<PickerState | null>(null);
    const [pinned, setPinned] = useState(false);
    const fetchGen = useRef(0);

    useEffect(() => {
        if (enabled) prefetchSmartLawArticlesForContext(context);
    }, [context, enabled]);

    const closeAll = useCallback(() => {
        setTooltip(null);
        setPicker(null);
        setPinned(false);
    }, []);

    useEffect(() => {
        if (!pinned) return undefined;
        const onDocPointerDown = (e: PointerEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('[data-smart-law-panel]')) return;
            if (target?.closest('.smart-law-link, [data-law-article]')) return;
            closeAll();
        };
        document.addEventListener('pointerdown', onDocPointerDown);
        return () => document.removeEventListener('pointerdown', onDocPointerDown);
    }, [pinned, closeAll]);

    const showTooltipForLink = useCallback(
        async (el: HTMLElement, rect: DOMRect, sticky = false) => {
            const parsed = readSmartLawLinkFromElement(el);
            if (!parsed) return;

            let lawId = parsed.lawId ?? resolveDefaultSmartLawId(context);
            if (!lawId) {
                if (options?.readOnly) {
                    setPinned(sticky);
                    setTooltip({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                        lawId: null,
                        articleNum: parsed.articleNum,
                        loading: false,
                        article: {
                            lawId: 'execution',
                            articleNumber: parsed.articleNum,
                            lawLabel: 'رابط قانوني',
                            title: `المادة ${parsed.articleNum}`,
                            content: 'لم يُحدَّد القانون لهذا الرابط.',
                        },
                    });
                    return;
                }
                setPinned(sticky);
                setPicker({
                    x: rect.left + rect.width / 2,
                    y: rect.bottom + 6,
                    articleNum: parsed.articleNum,
                    target: el,
                });
                setTooltip(null);
                return;
            }

            const gen = ++fetchGen.current;
            setPinned(sticky);
            setTooltip({
                x: rect.left + rect.width / 2,
                y: rect.top - 8,
                lawId,
                articleNum: parsed.articleNum,
                loading: true,
                article: null,
            });
            setPicker(null);

            const article = await fetchSmartLawArticle(lawId, parsed.articleNum);
            if (gen !== fetchGen.current) return;

            setTooltip({
                x: rect.left + rect.width / 2,
                y: rect.top - 8,
                lawId,
                articleNum: parsed.articleNum,
                loading: false,
                article:
                    article ??
                    ({
                        lawId,
                        articleNumber: parsed.articleNum,
                        lawLabel: fallbackLawSummary(lawId, parsed.articleNum),
                        title: `المادة ${parsed.articleNum}`,
                        content: '',
                    } satisfies ResolvedSmartLawArticle),
            });
        },
        [context, options?.readOnly],
    );

    const openLinkPanel = useCallback(
        (target: HTMLElement) => {
            const rect = target.getBoundingClientRect();
            void showTooltipForLink(target, rect, true);
        },
        [showTooltipForLink],
    );

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLElement>) => {
            if (!enabled) return;
            const target = findSmartLawLinkTarget(e.target);
            if (!target) return;
            e.preventDefault();
            e.stopPropagation();
            openLinkPanel(target);
        },
        [enabled, openLinkPanel],
    );

    const handleMouseOver = useCallback(
        (e: React.MouseEvent<HTMLElement>) => {
            if (!enabled || pinned) return;
            const target = findSmartLawLinkTarget(e.target);
            if (!target) return;
            void showTooltipForLink(target, target.getBoundingClientRect(), false);
        },
        [enabled, pinned, showTooltipForLink],
    );

    const handleMouseLeave = useCallback(() => {
        if (!pinned) closeAll();
    }, [pinned, closeAll]);

    const handlePickLaw = useCallback(
        (lawId: SmartLawId) => {
            if (!picker) return;
            assignSmartLawIdToElement(picker.target, lawId);
            setPicker(null);
            options?.onLinkAssigned?.();
            openLinkPanel(picker.target);
        },
        [openLinkPanel, options, picker],
    );

    return {
        enabled,
        tooltip,
        picker,
        pinned,
        closeAll,
        handleMouseOver,
        handleMouseLeave,
        handleClick,
        handlePickLaw,
    };
}
