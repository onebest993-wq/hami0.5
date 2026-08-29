/** عقد تصفية مواد — مشترك بين المقر وقارئ المحامي، بلا استيراد واجهات. */
export type LawStructureFilter = {
    id: string;
    label: string;
    from: number;
    to: number;
};
