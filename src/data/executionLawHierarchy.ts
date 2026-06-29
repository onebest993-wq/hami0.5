/**
 * التصنيف المتدرج لقانون التنفيذ — 6 تبويبات عامة (Task-Oriented) × إجراءات فرعية × مدى المواد.
 * مستند لمتن القانون رقم 45 لسنة 1980 (130 مادة).
 */

export type ExecutionLawParentId =
    | 'instruments_prelude'
    | 'settlements_emergency'
    | 'bodily_coercion_stay'
    | 'executive_seizure'
    | 'auctions_eviction'
    | 'distribution_appeals';

export type ExecutionLawLeafId =
    | 'objectives_directorates'
    | 'judgments_instruments_conditions'
    | 'voluntary_execution_notice'
    | 'coercive_start_objections'
    | 'bail_travel_ban'
    | 'asset_inventory_settlements'
    | 'execution_expenses_reprocessing'
    | 'debtor_death_occupancy_change'
    | 'debtor_imprisonment_release'
    | 'refusal_minor_chattel_delivery'
    | 'abandonment_delay_stay'
    | 'seizure_general_rules'
    | 'exempt_assets'
    | 'movables_seizure'
    | 'third_party_garnishment'
    | 'salary_garnishment'
    | 'real_estate_seizure'
    | 'movables_sale'
    | 'real_estate_auction'
    | 'adjudication_delivery'
    | 'mortgaged_assets_sale'
    | 'privilege_debt_distribution'
    | 'prescription_lapse'
    | 'grievance_cassation'
    | 'closing_provisions';

export interface ExecutionLawLeafDef {
    id: ExecutionLawLeafId;
    label: string;
    articleFrom: number;
    articleTo: number;
}

export interface ExecutionLawParentDef {
    id: ExecutionLawParentId;
    label: string;
    /** وصف مهمة التبويب للمحامي (اختياري للعرض) */
    taskHint?: string;
    children: ExecutionLawLeafDef[];
}

export const EXECUTION_LAW_HIERARCHY: ExecutionLawParentDef[] = [
    {
        id: 'instruments_prelude',
        label: 'السندات ومقدمات التنفيذ',
        taskHint: 'قبول الإضبارة والتبليغات',
        children: [
            { id: 'objectives_directorates', label: 'أهداف وتشكيلات دوائر التنفيذ', articleFrom: 1, articleTo: 8 },
            {
                id: 'judgments_instruments_conditions',
                label: 'شروط الأحكام والمحررات التنفيذية',
                articleFrom: 9,
                articleTo: 17,
            },
            { id: 'voluntary_execution_notice', label: 'التنفيذ الرضائي والإخبارية', articleFrom: 18, articleTo: 21 },
            { id: 'coercive_start_objections', label: 'بدء التنفيذ الجبري والاعتراضات', articleFrom: 22, articleTo: 29 },
        ],
    },
    {
        id: 'settlements_emergency',
        label: 'التسويات والطوارئ',
        taskHint: 'سير الإضبارة وعروض المدين',
        children: [
            { id: 'bail_travel_ban', label: 'التكليف بالكفالة ومنع السفر', articleFrom: 30, articleTo: 30 },
            { id: 'asset_inventory_settlements', label: 'حصر الأموال والتسويات المالية', articleFrom: 31, articleTo: 33 },
            { id: 'execution_expenses_reprocessing', label: 'نفقات التنفيذ وإعادة المعاملة', articleFrom: 34, articleTo: 36 },
            { id: 'debtor_death_occupancy_change', label: 'وفاة المدين وتبدل يد الشاغل', articleFrom: 37, articleTo: 39 },
        ],
    },
    {
        id: 'bodily_coercion_stay',
        label: 'الإكراه البدني ووقف التنفيذ',
        taskHint: 'تقييد حريات المدين وتعطيل الإجراءات',
        children: [
            { id: 'debtor_imprisonment_release', label: 'حبس المدين وإخلاء سبيله', articleFrom: 40, articleTo: 47 },
            { id: 'refusal_minor_chattel_delivery', label: 'الامتناع عن تسليم الصغير / الأشياء', articleFrom: 48, articleTo: 49 },
            { id: 'abandonment_delay_stay', label: 'ترك المراجعة وتأخير ووقف التنفيذ', articleFrom: 50, articleTo: 53 },
        ],
    },
    {
        id: 'executive_seizure',
        label: 'الحجز التنفيذي',
        taskHint: 'إجراءات الحجز المالي والعيني',
        children: [
            { id: 'seizure_general_rules', label: 'قواعد الحجز العامة', articleFrom: 54, articleTo: 61 },
            { id: 'exempt_assets', label: 'الأموال المستثناة من الحجز', articleFrom: 62, articleTo: 62 },
            { id: 'movables_seizure', label: 'حجز الأموال المنقولة', articleFrom: 63, articleTo: 70 },
            { id: 'third_party_garnishment', label: 'حجز أموال المدين لدى الغير', articleFrom: 75, articleTo: 81 },
            { id: 'salary_garnishment', label: 'حجز الرواتب والمخصصات', articleFrom: 82, articleTo: 85 },
            { id: 'real_estate_seizure', label: 'حجز العقارات ووضع اليد', articleFrom: 86, articleTo: 93 },
        ],
    },
    {
        id: 'auctions_eviction',
        label: 'المزايدات العلنية والتخلية',
        taskHint: 'بيع الأموال وتسليم العقارات',
        children: [
            { id: 'movables_sale', label: 'بيع الأموال المنقولة', articleFrom: 71, articleTo: 74 },
            { id: 'real_estate_auction', label: 'مزايدة العقارات وتدوير المزايدة', articleFrom: 94, articleTo: 100 },
            { id: 'adjudication_delivery', label: 'الإحالة القطعية وتسليم العقار', articleFrom: 101, articleTo: 106 },
            { id: 'mortgaged_assets_sale', label: 'بيع الأموال المرهونة', articleFrom: 107, articleTo: 107 },
        ],
    },
    {
        id: 'distribution_appeals',
        label: 'التوزيع، التقادم، والطعون',
        taskHint: 'نهاية الإضبارة والطعن على قرارات المنفذ',
        children: [
            { id: 'privilege_debt_distribution', label: 'ديون الامتياز وتوزيع الحصيلة', articleFrom: 108, articleTo: 111 },
            { id: 'prescription_lapse', label: 'التقادم وسقوط القوة التنفيذية', articleFrom: 112, articleTo: 117 },
            { id: 'grievance_cassation', label: 'طرق الطعن: التظلم والتمييز', articleFrom: 118, articleTo: 124 },
            { id: 'closing_provisions', label: 'الأحكام الختامية', articleFrom: 125, articleTo: 130 },
        ],
    },
];

export const EXECUTION_LAW_PARENTS = EXECUTION_LAW_HIERARCHY;

const LEAF_BY_ID = new Map<ExecutionLawLeafId, ExecutionLawLeafDef & { parentId: ExecutionLawParentId }>();
const LEAF_RANGES: Array<ExecutionLawLeafDef & { parentId: ExecutionLawParentId }> = [];

for (const parent of EXECUTION_LAW_HIERARCHY) {
    for (const child of parent.children) {
        const row = { ...child, parentId: parent.id };
        LEAF_BY_ID.set(child.id, row);
        LEAF_RANGES.push(row);
    }
}

export function getExecutionLawParentIndex(parentId: ExecutionLawParentId): number {
    return EXECUTION_LAW_HIERARCHY.findIndex((p) => p.id === parentId);
}

export function getExecutionLawParentById(parentId: ExecutionLawParentId): ExecutionLawParentDef | undefined {
    return EXECUTION_LAW_HIERARCHY.find((p) => p.id === parentId);
}

export function getExecutionLawLeafById(
    leafId: ExecutionLawLeafId
): (ExecutionLawLeafDef & { parentId: ExecutionLawParentId }) | undefined {
    return LEAF_BY_ID.get(leafId);
}

export function articleInLeafRange(articleNumber: number, leaf: ExecutionLawLeafDef): boolean {
    const n = Number(articleNumber);
    return Number.isFinite(n) && n >= leaf.articleFrom && n <= leaf.articleTo;
}

export function resolveExecutionLawLeaf(
    articleNumber: number
): ExecutionLawLeafDef & { parentId: ExecutionLawParentId } {
    const n = Number(articleNumber);
    if (!Number.isFinite(n)) return LEAF_RANGES[0];
    const hit = LEAF_RANGES.find((leaf) => n >= leaf.articleFrom && n <= leaf.articleTo);
    return hit ?? LEAF_RANGES[0];
}

/** إضبارة تخلية: التبويب 5 + فرع الإحالة القطعية وتسليم العقار */
export const TAKHLYA_PARENT_ID: ExecutionLawParentId = 'auctions_eviction';
export const TAKHLYA_DEFAULT_LEAF_ID: ExecutionLawLeafId = 'adjudication_delivery';

export type ExecutionLawLeafFilter = ExecutionLawLeafId | 'all_in_parent';

/** عرض كل مواد القانون 1–130 دون تقييد التبويب */
export type ExecutionLawParentScope = ExecutionLawParentId | 'all_articles';

export const ALL_EXECUTION_ARTICLES_SCOPE = 'all_articles' as const;

/** فلاتر استعراض الأدمن — مُشتقة من التصنيف الفرعي نفسه */
export function buildExecutionLawAdminBrowseFilters(): Array<{
    id: string;
    label: string;
    from: number;
    to: number;
}> {
    return EXECUTION_LAW_HIERARCHY.flatMap((parent) =>
        parent.children.map((child) => ({
            id: `exec-${child.id}`,
            label: child.label,
            from: child.articleFrom,
            to: child.articleTo,
        }))
    );
}
