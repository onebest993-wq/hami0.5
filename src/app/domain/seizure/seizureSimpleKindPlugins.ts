import type { SeizureWorkflowDossierInput } from './seizureWorkflowTypes';

/** أنواع الحجز البسيطة — بدون دورة الخطوات الثمانية */
export type SeizureSimpleKind = 'salary' | 'third_party' | 'notice';

export type SeizureSimpleKindPlugin = {
    kind: SeizureSimpleKind;
    subtype: string;
    labelAr: string;
    /** حدث التركيز inline بعد موافقة المنفذ */
    focusEventName: string;
};

export const SALARY_SIMPLE_PLUGIN: SeizureSimpleKindPlugin = {
    kind: 'salary',
    subtype: 'salary',
    labelAr: 'حجز راتب',
    focusEventName: 'hami-focus-salary-seizure-inline',
};

export const THIRD_PARTY_SIMPLE_PLUGIN: SeizureSimpleKindPlugin = {
    kind: 'third_party',
    subtype: 'third_party',
    labelAr: 'حجز لدى الغير',
    focusEventName: 'hami-focus-seizure-third-party-inline',
};

export const NOTICE_SIMPLE_PLUGIN: SeizureSimpleKindPlugin = {
    kind: 'notice',
    subtype: 'notice',
    labelAr: 'إشارة / إخبار',
    focusEventName: 'hami-focus-seizure-notice-inline',
};

export const SEIZURE_SIMPLE_PLUGINS: Record<SeizureSimpleKind, SeizureSimpleKindPlugin> = {
    salary: SALARY_SIMPLE_PLUGIN,
    third_party: THIRD_PARTY_SIMPLE_PLUGIN,
    notice: NOTICE_SIMPLE_PLUGIN,
};

export const SEIZURE_BASIC_INIT_SUBTYPES = new Set([
    'property',
    'movable',
    'movable_auction',
    'third_party',
    'salary',
]);

export function getSeizureSimplePlugin(kind: SeizureSimpleKind): SeizureSimpleKindPlugin {
    return SEIZURE_SIMPLE_PLUGINS[kind];
}

export function inferSeizureSimpleKindFromSubtype(subtype: string): SeizureSimpleKind | null {
    const st = String(subtype || '').trim();
    if (st === 'salary') return 'salary';
    if (st === 'third_party') return 'third_party';
    if (st === 'notice') return 'notice';
    return null;
}

export function inferSeizureSubtypeFromDecisionText(text: string): string {
    const t = String(text || '');
    if (/عقار/i.test(t)) return 'property';
    if (/إشارة/i.test(t)) return 'notice';
    if (/الغير|طرف ثالث/i.test(t)) return 'third_party';
    if (/منقول|مركبة/i.test(t)) return 'movable_auction';
    if (/راتب|حوافز|مخصصات/i.test(t)) return 'salary';
    return '';
}

export type SeizureBasicRequestInput = {
    dossierInput: SeizureWorkflowDossierInput;
    title: string;
    body: string;
    subtype: string;
    decisions?: Array<Record<string, unknown>>;
    payloadExtra?: Record<string, unknown>;
};

export type SeizureBasicRequestResult = {
    ok: boolean;
    decisionId: string | null;
    dossierId?: string;
    error?: 'invalid_dossier' | 'duplicate';
};
