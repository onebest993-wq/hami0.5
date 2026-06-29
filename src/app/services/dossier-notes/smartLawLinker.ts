/**
 * Smart Law Linker — regex, context mapping, inline spans (reference only in storage).
 */
import type { CivilLawCodeType } from '@/app/constants/iraqiLawCatalog';
import type { LegalCodeType } from '@/app/components/lawyer/criminal-system/legalCodes/legalCodesConstants';

export type DossierNoteContext =
    | { kind: 'execution' }
    | {
          kind: 'lawsuit';
          lawsuitType?: 'civil' | 'criminal' | 'personal_status' | 'commercial' | 'administrative' | 'other';
      }
    | { kind: 'repository' };

/** مرجع القانون المخزَّن في HTML — لا يُخزَّن نص المادة كاملاً. */
export type SmartLawId =
    | 'execution'
    | 'civil_procedure'
    | 'evidence'
    | 'penal'
    | 'criminal_procedure';

export const SMART_LAW_PICKER_OPTIONS: ReadonlyArray<{ id: SmartLawId; label: string }> = [
    { id: 'execution', label: 'قانون التنفيذ' },
    { id: 'civil_procedure', label: 'قانون المرافعات المدنية' },
    { id: 'evidence', label: 'قانون الإثبات' },
    { id: 'penal', label: 'قانون العقوبات' },
    { id: 'criminal_procedure', label: 'قانون أصول المحاكمات الجزائية' },
] as const;

/** يلتقط: المادة 32، مادة 32، م 32، المادة (32) */
export const LAW_ARTICLE_REGEX = /(?:المادة|مادة|م)\s*\(?\s*(\d+)\s*\)?/gi;

const LINK_CLASS =
    'smart-law-link text-[#E6C673] underline decoration-dotted decoration-[#E6C673]/55 cursor-pointer';
const PENDING_CLASS = 'smart-law-link--pending ring-1 ring-[#E6C673]/25';

export function inferLawsuitTypeFromDocType(docType?: string | null): NonNullable<
    Extract<DossierNoteContext, { kind: 'lawsuit' }>['lawsuitType']
> {
    const raw = String(docType ?? '').trim().toLowerCase();
    if (/جزائ|جنائ|criminal/.test(raw)) return 'criminal';
    if (/أحوال|personal|أسرة|زوج/.test(raw)) return 'personal_status';
    if (/تجار|commercial/.test(raw)) return 'commercial';
    if (/إدار|admin/.test(raw)) return 'administrative';
    if (/مدن|civil/.test(raw)) return 'civil';
    return 'civil';
}

export function isSmartLawLinksEnabled(ctx: DossierNoteContext): boolean {
    return ctx.kind !== 'repository';
}

export function resolveDefaultSmartLawId(ctx: DossierNoteContext): SmartLawId | null {
    if (ctx.kind === 'execution') return 'execution';
    if (ctx.kind === 'repository') return null;
    switch (ctx.lawsuitType) {
        case 'criminal':
            return 'penal';
        case 'civil':
        case 'commercial':
        case 'administrative':
        case 'personal_status':
        case 'other':
        default:
            return 'civil_procedure';
    }
}

export function smartLawIdToCivilTab(lawId: SmartLawId): CivilLawCodeType | null {
    if (lawId === 'civil_procedure' || lawId === 'evidence') return lawId;
    return null;
}

export function smartLawIdToCriminalTab(lawId: SmartLawId): LegalCodeType | null {
    if (lawId === 'penal') return 'penal';
    if (lawId === 'criminal_procedure') return 'procedure';
    return null;
}

export function lawLabelForId(lawId: SmartLawId): string {
    return SMART_LAW_PICKER_OPTIONS.find((o) => o.id === lawId)?.label ?? lawId;
}

export function parseSmartLawId(raw: string | null | undefined): SmartLawId | null {
    const value = String(raw ?? '').trim() as SmartLawId;
    return SMART_LAW_PICKER_OPTIONS.some((o) => o.id === value) ? value : null;
}

function escapeHtmlAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function buildLawLinkSpan(matchText: string, articleNum: number, lawId: SmartLawId | null): string {
    const lawAttr = lawId ? ` data-law-id="${lawId}"` : '';
    const pending = lawId ? '' : ` ${PENDING_CLASS}`;
    return `<span class="${LINK_CLASS}${pending}" data-law-article="${articleNum}"${lawAttr}>${escapeHtmlAttr(matchText)}</span>`;
}

export function decorateLawArticlesInPlainText(text: string, ctx: DossierNoteContext): string {
    if (!isSmartLawLinksEnabled(ctx)) return text;
    const defaultLawId = resolveDefaultSmartLawId(ctx);
    LAW_ARTICLE_REGEX.lastIndex = 0;
    return text.replace(LAW_ARTICLE_REGEX, (match, num) => {
        const articleNum = Number(num);
        if (!Number.isFinite(articleNum)) return match;
        return buildLawLinkSpan(match, articleNum, defaultLawId);
    });
}

/** يزيل نصوص tooltips القديمة — لا تُخزَّن في قاعدة البيانات. */
export function stripStoredLawTipAttributes(html: string): string {
    if (!html.includes('data-law-tip')) return html;
    if (typeof document === 'undefined') {
        return html.replace(/\s*data-law-tip="[^"]*"/gi, '');
    }
    const root = document.createElement('div');
    root.innerHTML = html;
    root.querySelectorAll('[data-law-tip]').forEach((el) => el.removeAttribute('data-law-tip'));
    return root.innerHTML;
}

export function normalizeSmartLawLinkHtml(html: string): string {
    return stripStoredLawTipAttributes(html);
}

export function decorateLawArticlesInHtml(html: string, ctx: DossierNoteContext): string {
    if (!isSmartLawLinksEnabled(ctx)) return html;
    if (!html.trim()) return html;
    if (typeof document === 'undefined') return html;

    const cleaned = stripStoredLawTipAttributes(html);
    const root = document.createElement('div');
    root.innerHTML = cleaned;
    const defaultLawId = resolveDefaultSmartLawId(ctx);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
        const parent = (node as Text).parentElement;
        if (parent?.closest('.smart-law-link, [data-law-article]')) {
            node = walker.nextNode();
            continue;
        }
        const source = (node as Text).textContent ?? '';
        LAW_ARTICLE_REGEX.lastIndex = 0;
        if (LAW_ARTICLE_REGEX.test(source)) textNodes.push(node as Text);
        node = walker.nextNode();
    }

    for (const textNode of textNodes) {
        const source = textNode.textContent ?? '';
        LAW_ARTICLE_REGEX.lastIndex = 0;
        const parts: Array<{ type: 'text' | 'link'; value: string; articleNum?: number }> = [];
        let lastIndex = 0;
        for (const match of source.matchAll(LAW_ARTICLE_REGEX)) {
            const idx = match.index ?? 0;
            if (idx > lastIndex) parts.push({ type: 'text', value: source.slice(lastIndex, idx) });
            const articleNum = Number(match[1]);
            parts.push({ type: 'link', value: match[0], articleNum });
            lastIndex = idx + match[0].length;
        }
        if (parts.length === 0) continue;
        if (lastIndex < source.length) parts.push({ type: 'text', value: source.slice(lastIndex) });

        const frag = document.createDocumentFragment();
        for (const part of parts) {
            if (part.type === 'text') {
                frag.appendChild(document.createTextNode(part.value));
            } else if (part.articleNum != null) {
                const span = document.createElement('span');
                span.className = LINK_CLASS + (defaultLawId ? '' : ` ${PENDING_CLASS}`);
                span.dataset.lawArticle = String(part.articleNum);
                if (defaultLawId) span.dataset.lawId = defaultLawId;
                span.textContent = part.value;
                frag.appendChild(span);
            }
        }
        textNode.replaceWith(frag);
    }

    if (defaultLawId) {
        root.querySelectorAll('[data-law-article]:not([data-law-id])').forEach((el) => {
            if (!(el instanceof HTMLElement)) return;
            el.dataset.lawId = defaultLawId;
            el.classList.remove('smart-law-link--pending');
        });
    }

    return root.innerHTML;
}

/** @deprecated — للتوافق؛ النص الكامل يُجلب عند Hover */
export function resolveLawArticleTooltip(articleNum: number, ctx: DossierNoteContext): string {
    const lawId = resolveDefaultSmartLawId(ctx);
    if (!lawId) return `المادة ${articleNum} — اختر القانون`;
    return `المادة ${articleNum} — ${lawLabelForId(lawId)}`;
}

export function assignSmartLawIdToElement(el: HTMLElement, lawId: SmartLawId): void {
    el.dataset.lawId = lawId;
    el.classList.remove('smart-law-link--pending');
    el.removeAttribute('data-law-tip');
}

export function readSmartLawLinkFromElement(el: HTMLElement): {
    articleNum: number;
    lawId: SmartLawId | null;
} | null {
    const articleRaw = el.getAttribute('data-law-article');
    const articleNum = Number(articleRaw);
    if (!Number.isFinite(articleNum)) return null;
    return { articleNum, lawId: parseSmartLawId(el.getAttribute('data-law-id')) };
}
