/** نوع الأصل للحجز — يُستخدم لطلبات المنقول/العقار الأساسية */
export type SeizureAssetKind = 'movable' | 'property';

/** مُدخلات حل معرّف الإضبارة لطلبات الحجز الأساسية */
export type SeizureWorkflowDossierInput = {
    decisionsStorageExecutionId?: string;
    executionId?: string;
    executionDataId?: string;
    executionData?: Record<string, unknown> | null;
};
