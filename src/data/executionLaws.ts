/**
 * قانون التنفيذ العراقي رقم 45 لسنة 1980 — بيانات المواد + فلترة وبحث.
 */

import executionLawArticles from './executionLaws.articles.json';
import {
    resolveExecutionLawLeaf,
    type ExecutionLawLeafId,
    type ExecutionLawParentId,
    type ExecutionLawLeafFilter,
} from './executionLawHierarchy';

export type {
    ExecutionLawParentId,
    ExecutionLawLeafId,
    ExecutionLawLeafFilter,
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
} from './executionLawHierarchy';

export interface ExecutionLawArticle {
    number: number;
    title: string;
    content: string;
    parentId: ExecutionLawParentId;
    leafId: ExecutionLawLeafId;
    leafLabel: string;
}

export function normalizeLawSearchText(s: string): string {
    return s
        .trim()
        .toLowerCase()
        .normalize('NFC')
        .replace(/[\u0623\u0625\u0622\u0671]/g, 'ا')
        .replace(/\u0629/g, 'ه')
        .replace(/\u0649/g, 'ي')
        .replace(/\u064A/g, 'ي')
        .replace(/[\u064B-\u0652]/g, '');
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
        `${numLat}\n${numIndic}\n${westernDigits(numLat)}\n${art.title}\n${art.content}\n${art.leafLabel}`
    );
}

export function filterExecutionLawsByHierarchy(
    laws: ExecutionLawArticle[],
    parentId: ExecutionLawParentId,
    leafFilter: ExecutionLawLeafFilter,
    searchQuery: string
): ExecutionLawArticle[] {
    const qNorm = normalizeLawSearchText(westernDigits(searchQuery));
    let list = laws.filter((a) => a.parentId === parentId);
    if (leafFilter !== 'all_in_parent') {
        list = list.filter((a) => a.leafId === leafFilter);
    }
    if (qNorm) {
        list = laws.filter((a) => articleSearchHaystack(a).includes(qNorm));
    }
    return [...list].sort((a, b) => a.number - b.number);
}

export function searchExecutionLawsGlobal(
    laws: ExecutionLawArticle[],
    searchQuery: string
): ExecutionLawArticle[] {
    const qNorm = normalizeLawSearchText(westernDigits(searchQuery));
    if (!qNorm) return [];
    return [...laws.filter((a) => articleSearchHaystack(a).includes(qNorm))].sort(
        (a, b) => a.number - b.number
    );
}

export const executionArticles = [
    {
        number: 30,
        title: 'تسليم الأشياء المعينة',
        text: 'اذا كان المحكوم به تسليم شيء معين منقولا كان او عقارا، فيقوم المنفذ العدل بتسليمه الى المحكوم له. واذا كان الشيء خارجا عن حيازة المحكوم عليه، فيتخذ المنفذ العدل الاجراءات القانونية لجلبه وتسليمه.',
        category: 'إجراءات التسليم والتخلية',
    },
    {
        number: 32,
        title: 'تخلية العقار',
        text: 'اذا كان المحكوم به تخلية عقار، فيقوم المنفذ العدل باخبار المحكوم عليه بلزوم تخليته وتسليمه الى المحكوم له خلال سبعة ايام من تاريخ التبليغ.',
        category: 'إجراءات التسليم والتخلية',
    },
    {
        number: 36,
        title: 'رفض المحكوم له تسلم الأشياء',
        text: 'اذا رفض المحكوم له تسلم الاشياء التي اخليت من العقار، فعلى المنفذ العدل ان ينذره بتسلمها خلال مدة مناسبة، والا بيعت بالمزايدة وحفظ ثمنها امانة باسمه.',
        category: 'إجراءات التسليم والتخلية',
    },
    {
        number: 40,
        title: 'الحبس التنفيذي',
        text: 'للمنفذ العدل، بناء على طلب الدائن، ان يقرر حبس المدين وفقا لاحكام هذا القانون، اذا ثبت له اقتداره على الوفاء وامتنع عنه، او اذا رفض التسوية التي قررها المنفذ العدل.',
        category: 'التنفيذ الجبري الشخصي - الحبس',
    },
    {
        number: 68,
        title: 'السكن المشترك',
        text: 'اذا وجد اشخاص اخرون مقيمون مع المدين في موطنه، وتبين ان الاموال المحجوزة عائدة لهم، فلا ينفذ قرار الحجز، ويرفع المحضر للمنفذ العدل لتقرير ما يراه مناسبا.',
        category: 'الحجز والمنقول والرواتب',
    },
];

type ExecutionLawSeedOverride = {
    number: number;
    title: string;
    text: string;
};

const executionLawSeedOverrides = new Map<number, ExecutionLawSeedOverride>(
    (executionArticles as ExecutionLawSeedOverride[]).map((a) => [a.number, a])
);

export const executionLawData: ExecutionLawArticle[] = (executionLawArticles as Array<{
    number: number;
    title?: string;
    content?: string;
}>).map((a) => {
    const override = executionLawSeedOverrides.get(a.number);
    const leaf = resolveExecutionLawLeaf(a.number);
    return {
        number: a.number,
        title: override?.title ?? String(a.title || ''),
        content: override?.text ?? String(a.content || ''),
        parentId: leaf.parentId,
        leafId: leaf.id,
        leafLabel: leaf.label,
    };
});
