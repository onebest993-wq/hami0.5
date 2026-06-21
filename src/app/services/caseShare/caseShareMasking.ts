import type {
    CaseShareMaskedView,
    CaseShareVisibleFields,
    DossierShareSource,
} from './caseShareTypes';
import { DEFAULT_SECTION_VISIBILITY, resolveVisibleCatalog } from './caseShareVisibility';
import type { ShareCatalogItem, ShareCatalogSection, ShareSectionKey } from './caseShareTypes';

const HIDDEN_CASE = '[XXXX]';
const HIDDEN_PARTY = '[الطرف مجهول]';
const HIDDEN_COURT = '[محكمة مجهولة]';

export function maskPersonName(name: string, mode: 'full' | 'partial' | 'hidden'): string {
    const trimmed = name.trim();
    if (!trimmed) return '—';
    if (mode === 'hidden') return HIDDEN_PARTY;
    if (mode === 'full') return trimmed;
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return `${parts[0]!.slice(0, 1)}.`;
    const first = parts[0]!;
    const lastInitial = parts[parts.length - 1]!.slice(0, 1);
    return `${first} ${lastInitial}.`;
}

export function maskCourtLabel(
    label: string,
    province: string | undefined,
    mode: 'full' | 'partial' | 'hidden',
): string {
    const trimmed = label.trim();
    if (!trimmed && !province?.trim()) return '—';
    if (mode === 'hidden') return HIDDEN_COURT;
    if (mode === 'full') return trimmed || province || '—';
    const prov = province?.trim();
    if (prov) {
        const degree = trimmed.includes('استئناف')
            ? 'محكمة استئناف'
            : trimmed.includes('تمييز')
              ? 'محكمة تمييز'
              : 'محكمة بداءة';
        return `${degree} في ${prov}`;
    }
    return trimmed.split(/\s+/).slice(0, 3).join(' ') || HIDDEN_COURT;
}

export function maskCaseNumber(value: string, visible: boolean): string {
    const v = value.trim();
    if (!v) return '—';
    return visible ? v : HIDDEN_CASE;
}

function applyTermMasking(text: string, terms: string[]): string {
    let out = text;
    for (const term of terms) {
        const t = term.trim();
        if (t.length < 2) continue;
        const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out = out.replace(new RegExp(escaped, 'gi'), '████');
    }
    return out;
}

function redactCatalogItem(
    item: ShareCatalogItem,
    sectionKey: ShareSectionKey,
    fields: CaseShareVisibleFields,
): ShareCatalogItem {
    const terms = fields.masked_terms ?? [];
    let label = applyTermMasking(item.label, terms);
    let preview = item.preview ? applyTermMasking(item.preview, terms) : item.preview;

    if (sectionKey === 'parties') {
        label = maskPersonName(item.label, fields.parties_names);
        if (item.preview) preview = maskPersonName(item.preview, fields.parties_names);
    } else if (sectionKey === 'court') {
        label = maskCourtLabel(item.label, undefined, fields.court_details);
        if (item.preview) preview = maskCourtLabel(item.preview, undefined, fields.court_details);
    } else if (sectionKey === 'meta') {
        if (!fields.case_numbers) {
            label = maskCaseNumber(item.label, false);
            if (item.preview) preview = maskCaseNumber(item.preview, false);
        }
    }

    return { ...item, label, preview };
}

function redactVisibleCatalog(
    catalog: ShareCatalogSection[],
    fields: CaseShareVisibleFields,
): ShareCatalogSection[] {
    return catalog.map((section) => ({
        ...section,
        items: section.items.map((item) => redactCatalogItem(item, section.key, fields)),
    }));
}

export function buildMaskedView(
    source: DossierShareSource,
    fields: CaseShareVisibleFields,
    ownerDisplayName?: string,
    sessionDurationMinutes?: number,
): CaseShareMaskedView {
    const narrativeBase = fields.text_masking?.trim() || source.narrativeText;
    const narrative = applyTermMasking(narrativeBase, fields.masked_terms ?? []);

    const sectionMode = { ...DEFAULT_SECTION_VISIBILITY, ...fields.sectionMode };
    const hiddenItemIds = fields.hiddenItemIds ?? [];
    const visibleCatalog = redactVisibleCatalog(
        resolveVisibleCatalog(source.catalog ?? [], sectionMode, hiddenItemIds),
        fields,
    );

    const docsSection = visibleCatalog.find((s) => s.key === 'documents');
    const documentsIncluded =
        fields.documents && sectionMode.documents !== 'none' && (docsSection?.items.length ?? 0) > 0;

    return {
        module: source.module,
        dossierId: source.dossierId,
        title: source.title,
        caseNumbers: source.caseNumbers.map((n) => maskCaseNumber(n, fields.case_numbers)),
        parties: source.partyNames.map((n) => maskPersonName(n, fields.parties_names)),
        court: maskCourtLabel(source.courtLabel, source.courtProvince, fields.court_details),
        narrative,
        documentsIncluded,
        ownerDisplayName,
        visibleCatalog,
        sessionDurationMinutes,
    };
}

/** تطبيق العرض المقيد على واجهة المستلم (قراءة فقط) */
export function renderMaskedParty(name: string, mode: 'full' | 'partial' | 'hidden'): string {
    return maskPersonName(name, mode);
}

export function renderMaskedCourt(
    label: string,
    province: string | undefined,
    mode: 'full' | 'partial' | 'hidden',
): string {
    return maskCourtLabel(label, province, mode);
}
