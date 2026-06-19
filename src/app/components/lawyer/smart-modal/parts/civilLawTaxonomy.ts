import type { CivilLawCodeType } from '@/app/constants/iraqiLawCatalog';
import { articleNumberInRange, extractArticleSortNumber } from '@/app/utils/articleNumberRange';
import type { LawStructureFilter } from '@/app/components/admin/lawStructure';

export type CivilLawTaxonomyNode = {
    id: string;
    label: string;
    from: number;
    to: number;
    /** مواد ملغاة ضمن النطاق — لا تُعرض عند التصفية الدقيقة بالعقدة */
    exclude?: readonly number[];
};

export type CivilLawTaxonomyBranch = {
    id: string;
    label: string;
    from: number;
    to: number;
    nodes: CivilLawTaxonomyNode[];
};

export type CivilLawTaxonomySection = {
    id: string;
    label: string;
    from: number;
    to: number;
    branches: CivilLawTaxonomyBranch[];
};

export type CivilLawTaxonomy = {
    codeType: CivilLawCodeType;
    sections: CivilLawTaxonomySection[];
};

function node(
    id: string,
    label: string,
    from: number,
    to: number,
    exclude?: readonly number[],
): CivilLawTaxonomyNode {
    return { id, label, from, to, ...(exclude?.length ? { exclude } : {}) };
}

function branch(
    id: string,
    label: string,
    from: number,
    to: number,
    nodes: CivilLawTaxonomyNode[],
): CivilLawTaxonomyBranch {
    return { id, label, from, to, nodes };
}

function section(
    id: string,
    label: string,
    from: number,
    to: number,
    branches: CivilLawTaxonomyBranch[],
): CivilLawTaxonomySection {
    return { id, label, from, to, branches };
}

/** شجرة تصنيف قانون المرافعات المدنية — قسم ← فرع ← عقدة */
export const CIVIL_PROCEDURE_TAXONOMY: CivilLawTaxonomy = {
    codeType: 'civil_procedure',
    sections: [
        section('civ-s1', 'المبادئ والاختصاص والتبليغات', 1, 43, [
            branch('civ-s1-b1', 'المبادئ العامة وشروط الدعوى', 1, 12, [
                node('civ-s1-b1-n1', 'نطاق السريان وتعريف الدعوى', 1, 2),
                node('civ-s1-b1-n2', 'شروط الدعوى (الأهلية، الخصومة، المصلحة)', 3, 7),
                node('civ-s1-b1-n3', 'الدفوع والتناقض وتصنيف الدعاوى', 8, 12, [9]),
            ]),
            branch('civ-s1-b2', 'التبليغات القضائية', 13, 28, [
                node('civ-s1-b2-n1', 'طرق التبليغ وبيانات ورقة التبليغ', 13, 17, [17]),
                node('civ-s1-b2-n2', 'آليات التسليم وحالات الامتناع', 18, 20),
                node('civ-s1-b2-n3', 'التبليغ الاستثنائي (الشركات، مجهول الإقامة، السجناء)', 21, 21),
                node('civ-s1-b2-n4', 'حساب مدد التبليغ والمسافة', 22, 25),
                node('civ-s1-b2-n5', 'بطلان التبليغ والغرامات', 26, 28),
            ]),
            branch('civ-s1-b3', 'اختصاص المحاكم المدنية', 29, 43, [
                node('civ-s1-b3-n1', 'الولاية العامة للمحاكم', 29, 30),
                node('civ-s1-b3-n2', 'الاختصاص النوعي والقيمي', 31, 35),
                node('civ-s1-b3-n3', 'الاختصاص المكاني وتوابع الدعوى', 36, 43),
            ]),
        ]),
        section('civ-s2', 'إجراءات التداعي والمرافعة', 44, 97, [
            branch('civ-s2-b1', 'إقامة الدعوى والتمثيل القانوني', 44, 57, [
                node('civ-s2-b1-n1', 'عريضة الدعوى وإبطالها لنقص البيانات', 44, 50),
                node('civ-s2-b1-n2', 'التوكيل بالخصومة وصلاحيات الوكيل', 51, 53),
                node('civ-s2-b1-n3', 'غياب وحضور الخصوم وترك الدعوى', 54, 57),
            ]),
            branch('civ-s2-b2', 'إدارة الجلسة والدعوى الحادثة', 58, 72, [
                node('civ-s2-b2-n1', 'إدارة المرافعة والتأجيل وحفظ النظام', 58, 65),
                node('civ-s2-b2-n2', 'الدعوى المنضمة والمتقابلة', 66, 68),
                node('civ-s2-b2-n3', 'دخول وإدخال الشخص الثالث', 69, 72),
            ]),
            branch('civ-s2-b3', 'الدفوع وعوارض الخصومة والرد', 73, 97, [
                node('civ-s2-b3-n1', 'الدفوع الشكلية والموضوعية وتوحيد الدعاوى', 73, 81, [81]),
                node('civ-s2-b3-n2', 'وقف المرافعة وانقطاع الخصومة', 82, 87),
                node('civ-s2-b3-n3', 'التنازل وإبطال العريضة', 88, 90),
                node('civ-s2-b3-n4', 'عدم الصلاحية ورد القضاة ونقل الدعوى', 91, 97),
            ]),
        ]),
        section('civ-s3', 'القضاء الاستثنائي وإصدار الأحكام', 141, 167, [
            branch('civ-s3-b1', 'القضاء المستعجل والولائي', 141, 153, [
                node('civ-s3-b1-n1', 'حالات القضاء المستعجل', 141, 150),
                node('civ-s3-b1-n2', 'القضاء الولائي والتظلم', 151, 153),
            ]),
            branch('civ-s3-b2', 'إصدار الأحكام ومصاريف الدعوى', 154, 167, [
                node('civ-s3-b2-n1', 'المداولة والنطق بالحكم والإعلام', 154, 163),
                node('civ-s3-b2-n2', 'المشمول بالنفاذ المعجل', 164, 165),
                node('civ-s3-b2-n3', 'مصاريف الدعوى وأجور المحاماة وتصحيح الأخطاء', 166, 167),
            ]),
        ]),
        section('civ-s4', 'طرق الطعن بالأحكام', 168, 230, [
            branch('civ-s4-b1', 'القواعد العامة والاعتراض', 168, 184, [
                node('civ-s4-b1-n1', 'أحكام عامة ومدد الطعن وانقطاعها', 168, 176),
                node('civ-s4-b1-n2', 'الطعن بالاعتراض على الحكم الغيابي', 177, 184),
            ]),
            branch('civ-s4-b2', 'الاستئناف وإعادة المحاكمة', 185, 202, [
                node('civ-s4-b2-n1', 'الطعن الاستئنافي (الأصلي والمتقابل)', 185, 195),
                node('civ-s4-b2-n2', 'الطعن بإعادة المحاكمة', 196, 202),
            ]),
            branch('civ-s4-b3', 'التمييز وتصحيح القرار واعتراض الغير', 203, 230, [
                node('civ-s4-b3-n1', 'الطعن التمييزي وآلياته', 203, 218),
                node('civ-s4-b3-n2', 'الطعن بتصحيح القرار التمييزي', 219, 223),
                node('civ-s4-b3-n3', 'الطعن باعتراض الغير (الأصلي والطارئ)', 224, 230),
            ]),
        ]),
        section('civ-s5', 'الإجراءات المتنوعة والأحوال الشخصية', 231, 325, [
            branch('civ-s5-b1', 'الحجز الاحتياطي', 231, 250, [
                node('civ-s5-b1-n1', 'إيقاع الحجز والتظلم منه', 231, 240),
                node('civ-s5-b1-n2', 'حقوق الشخص الثالث والأموال المستثناة', 241, 250),
            ]),
            branch('civ-s5-b2', 'التحكيم والعرض والإيداع', 251, 285, [
                node('civ-s5-b2-n1', 'اتفاق التحكيم وتعيين المحكمين وردّهم', 251, 264),
                node('civ-s5-b2-n2', 'قرار التحكيم والتصديق عليه وإبطاله', 265, 276),
                node('civ-s5-b2-n3', 'العرض والإيداع الفعلي للوفاء', 277, 285),
            ]),
            branch('civ-s5-b3', 'شكوى القضاة والمعونة القضائية', 286, 298, [
                node('civ-s5-b3-n1', 'شكوى القضاة (مخاصمة القضاء)', 286, 292),
                node('civ-s5-b3-n2', 'المعونة القضائية للفقراء', 293, 298),
            ]),
            branch('civ-s5-b4', 'محاكم الأحوال الشخصية والأحكام الختامية', 299, 325, [
                node('civ-s5-b4-n1', 'اختصاصات محاكم الأحوال الشخصية وإجراءاتها', 299, 308),
                node('civ-s5-b4-n2', 'التمييز الوجوبي والقسامات', 309, 310),
                node('civ-s5-b4-n3', 'السجلات القضائية وتوثيقها وإلغاءات القوانين', 311, 325),
            ]),
        ]),
    ],
};

/** شجرة تصنيف قانون الإثبات — قسم ← فرع ← عقدة */
export const EVIDENCE_TAXONOMY: CivilLawTaxonomy = {
    codeType: 'evidence',
    sections: [
        section('evid-s1', 'المبادئ العامة والأدلة الكتابية', 1, 58, [
            branch('evid-s1-b1', 'المبادئ الأساسية للإثبات', 1, 17, [
                node('evid-s1-b1-n1', 'فلسفة الإثبات وتوجيه القاضي للدعوى', 1, 10),
                node('evid-s1-b1-n2', 'سريان القانون وتنازع القوانين', 11, 13),
                node('evid-s1-b1-n3', 'انتقال المحكمة والإنابة القضائية', 14, 17),
            ]),
            branch('evid-s1-b2', 'الأدلة الكتابية وحجيتها', 18, 38, [
                node('evid-s1-b2-n1', 'السندات الرسمية والعادية وحجية الصور', 18, 27),
                node('evid-s1-b2-n2', 'الدفاتر التجارية والأوراق الخاصة', 28, 33),
                node('evid-s1-b2-n3', 'الادعاء بالتزوير في السندات', 34, 38),
            ]),
            branch('evid-s1-b3', 'الإنكار وإلزام الخصم بتقديم الأدلة', 39, 58, [
                node('evid-s1-b3-n1', 'إنكار التوقيع/البصمة وإجراءات المضاهاة', 39, 52),
                node('evid-s1-b3-n2', 'إلزام الخصم بتقديم الدفاتر والسندات', 53, 58),
            ]),
        ]),
        section('evid-s2', 'الأدلة الشفوية والقرائن', 59, 107, [
            branch('evid-s2-b1', 'الإقرار والاستجواب', 59, 75, [
                node('evid-s2-b1-n1', 'الإقرار القضائي وغير القضائي وشروطهما', 59, 70),
                node('evid-s2-b1-n2', 'طلب استجواب الخصوم وناقصي الأهلية', 71, 75),
            ]),
            branch('evid-s2-b2', 'الشهادة', 76, 97, [
                node('evid-s2-b2-n1', 'نصاب الإثبات بالشهادة ومبدأ الثبوت بالكتابة', 76, 79),
                node('evid-s2-b2-n2', 'سلطة المحكمة وموانع الشهادة', 80, 90),
                node('evid-s2-b2-n3', 'إجراءات طلب الشهود وتبليغهم وتغريمهم', 91, 97),
            ]),
            branch('evid-s2-b3', 'القرائن وحجية الأحكام', 98, 107, [
                node('evid-s2-b3-n1', 'القرائن القانونية والقضائية واستنباط القاضي', 98, 104),
                node('evid-s2-b3-n2', 'حجية الأحكام الباتة', 105, 107),
            ]),
        ]),
        section('evid-s3', 'اليمين والمعاينة والخبرة', 108, 149, [
            branch('evid-s3-b1', 'اليمين', 108, 124, [
                node('evid-s3-b1-n1', 'صيغة اليمين وأحكام أدائها', 108, 113),
                node('evid-s3-b1-n2', 'اليمين الحاسمة', 114, 119),
                node('evid-s3-b1-n3', 'اليمين المتممة والاستظهارية', 120, 124),
            ]),
            branch('evid-s3-b2', 'المعاينة والخبرة', 125, 146, [
                node('evid-s3-b2-n1', 'إجراءات المعاينة والانتقال وتدوين المحضر', 125, 131),
                node('evid-s3-b2-n2', 'الخبراء (اختيارهم، ردّهم، وأجورهم)', 132, 141),
                node('evid-s3-b2-n3', 'عمل الخبير وإعداد التقرير والطعن فيه', 142, 146),
            ]),
            branch('evid-s3-b3', 'الأحكام الختامية', 147, 149, [
                node('evid-s3-b3-n1', 'الإلغاءات وسريان القانون', 147, 149),
            ]),
        ]),
    ],
};

const TAXONOMY_BY_CODE: Record<CivilLawCodeType, CivilLawTaxonomy> = {
    civil_procedure: CIVIL_PROCEDURE_TAXONOMY,
    evidence: EVIDENCE_TAXONOMY,
};

export function getCivilLawTaxonomy(codeType: CivilLawCodeType): CivilLawTaxonomy {
    return TAXONOMY_BY_CODE[codeType];
}

export function getLawTaxonomySectionFilters(codeType: CivilLawCodeType): LawStructureFilter[] {
    return getCivilLawTaxonomy(codeType).sections.map((item) => ({
        id: item.id,
        label: item.label,
        from: item.from,
        to: item.to,
    }));
}

export function findTaxonomySection(
    codeType: CivilLawCodeType,
    sectionId: string | null,
): CivilLawTaxonomySection | null {
    if (!sectionId) return null;
    return getCivilLawTaxonomy(codeType).sections.find((s) => s.id === sectionId) ?? null;
}

export function findTaxonomyBranch(
    section: CivilLawTaxonomySection | null,
    branchId: string | null,
): CivilLawTaxonomyBranch | null {
    if (!section || !branchId) return null;
    return section.branches.find((b) => b.id === branchId) ?? null;
}

export function findTaxonomyNode(
    branch: CivilLawTaxonomyBranch | null,
    nodeId: string | null,
): CivilLawTaxonomyNode | null {
    if (!branch || !nodeId) return null;
    return branch.nodes.find((n) => n.id === nodeId) ?? null;
}

function isExcludedArticle(n: number, exclude?: readonly number[]): boolean {
    return Boolean(exclude?.includes(n));
}

export function articleMatchesTaxonomyNode(
    articleNumber: string,
    taxonomyNode: CivilLawTaxonomyNode,
): boolean {
    const n = extractArticleSortNumber(articleNumber);
    if (n === null) return false;
    if (!articleNumberInRange(articleNumber, taxonomyNode.from, taxonomyNode.to)) return false;
    return !isExcludedArticle(n, taxonomyNode.exclude);
}

export function articleMatchesTaxonomyBranch(
    articleNumber: string,
    taxonomyBranch: CivilLawTaxonomyBranch,
): boolean {
    return taxonomyBranch.nodes.some((item) => articleMatchesTaxonomyNode(articleNumber, item));
}

export function articleMatchesTaxonomySection(
    articleNumber: string,
    taxonomySection: CivilLawTaxonomySection,
): boolean {
    return taxonomySection.branches.some((item) => articleMatchesTaxonomyBranch(articleNumber, item));
}

export function articleMatchesCivilLawTaxonomy(params: {
    articleNumber: string;
    codeType: CivilLawCodeType;
    sectionId: string | null;
    branchId: string | null;
    nodeId: string | null;
}): boolean {
    const { articleNumber, codeType, sectionId, branchId, nodeId } = params;
    const taxonomy = getCivilLawTaxonomy(codeType);
    const activeSection = findTaxonomySection(codeType, sectionId);
    const activeBranch = findTaxonomyBranch(activeSection, branchId);
    const activeNode = findTaxonomyNode(activeBranch, nodeId);

    if (activeNode) return articleMatchesTaxonomyNode(articleNumber, activeNode);
    if (activeBranch) return articleMatchesTaxonomyBranch(articleNumber, activeBranch);
    if (activeSection) return articleMatchesTaxonomySection(articleNumber, activeSection);

    if (sectionId || branchId || nodeId) {
        const fallback = taxonomy.sections.find((s) => s.id === sectionId);
        if (fallback) return articleNumberInRange(articleNumber, fallback.from, fallback.to);
        return false;
    }

    return true;
}
