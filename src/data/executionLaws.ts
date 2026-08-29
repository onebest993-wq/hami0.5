/**
 * قانون التنفيذ العراقي رقم 45 لسنة 1980 — أنواع + فلترة وبحث (بدون JSON ثقيل).
 * مواد JSON → loadExecutionLawSeedData() في executionLawsLoader.ts
 * لا يُعاد تصدير البذور/المحمل من هنا حتى لا يسحبها أي مستورد للفلاتر.
 */
import {
    ALL_EXECUTION_ARTICLES_SCOPE,
    type ExecutionLawLeafId,
    type ExecutionLawParentId,
    type ExecutionLawLeafFilter,
    type ExecutionLawParentScope,
} from './executionLawHierarchy';
import { normalizeLawSearchText } from './executionLawSearchNormalize';

export type {
    ExecutionLawParentId,
    ExecutionLawLeafId,
    ExecutionLawLeafFilter,
    ExecutionLawParentScope,
    ExecutionLawParentDef,
    ExecutionLawLeafDef,
} from './executionLawHierarchy';

export {
    EXECUTION_LAW_HIERARCHY,
    EXECUTION_LAW_PARENTS,
    getExecutionLawParentById,
    getExecutionLawParentIndex,
    getExecutionLawLeafById,
    articleInLeafRange,
    resolveExecutionLawLeaf,
    TAKHLYA_PARENT_ID,
    TAKHLYA_DEFAULT_LEAF_ID,
    ALL_EXECUTION_ARTICLES_SCOPE,
} from './executionLawHierarchy';

export { normalizeLawSearchText } from './executionLawSearchNormalize';

export interface ExecutionLawArticle {
    number: number;
    title: string;
    content: string;
    parentId: ExecutionLawParentId;
    leafId: ExecutionLawLeafId;
    leafLabel: string;
}

const AR_DIGIT_MAP: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
};

function westernDigits(s: string): string {
    let o = '';
    for (const ch of s) {
        o += AR_DIGIT_MAP[ch] ?? ch;
    }
    return o;
}

const INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function toIndicDigits(n: number): string {
    return String(n).replace(/\d/g, (d) => INDIC_DIGITS[Number(d)] ?? d);
}

function articleSearchHaystack(art: ExecutionLawArticle): string {
    const numLat = String(art.number);
    const numIndic = toIndicDigits(art.number);
    return normalizeLawSearchText(
        `${numLat}\n${numIndic}\n${westernDigits(numLat)}\n${art.title}\n${art.content}\n${art.leafLabel}`,
    );
}

export function filterExecutionLawsByHierarchy(
    laws: ExecutionLawArticle[],
    parentId: ExecutionLawParentId,
    leafFilter: ExecutionLawLeafFilter,
    searchQuery: string,
): ExecutionLawArticle[] {
    const qNorm = normalizeLawSearchText(westernDigits(searchQuery));
    let list = laws.filter((a) => a.parentId === parentId);
    if (leafFilter !== 'all_in_parent') {
        list = list.filter((a) => a.leafId === leafFilter);
    }
    if (qNorm) {
        list = list.filter((a) => articleSearchHaystack(a).includes(qNorm));
    }
    return [...list].sort((a, b) => a.number - b.number);
}

export function filterExecutionLawsByScope(
    laws: ExecutionLawArticle[],
    parentScope: ExecutionLawParentScope,
    leafFilter: ExecutionLawLeafFilter,
    searchQuery: string,
): ExecutionLawArticle[] {
    if (parentScope === ALL_EXECUTION_ARTICLES_SCOPE) {
        const qNorm = normalizeLawSearchText(westernDigits(searchQuery));
        let list = [...laws].sort((a, b) => a.number - b.number);
        if (qNorm) {
            list = list.filter((a) => articleSearchHaystack(a).includes(qNorm));
        }
        return list;
    }
    return filterExecutionLawsByHierarchy(laws, parentScope, leafFilter, searchQuery);
}

export function searchExecutionLawsGlobal(
    laws: ExecutionLawArticle[],
    searchQuery: string,
): ExecutionLawArticle[] {
    const qNorm = normalizeLawSearchText(westernDigits(searchQuery));
    if (!qNorm) return [];
    return [...laws.filter((a) => articleSearchHaystack(a).includes(qNorm))].sort(
        (a, b) => a.number - b.number,
    );
}
