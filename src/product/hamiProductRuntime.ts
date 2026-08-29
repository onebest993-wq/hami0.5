/**
 * هوية المنتج زمن التشغيل — تُعلَن من مدخل HTML لا من استيراد متبادل للواجهات.
 * مدخل المقر يستدعي markHqDocumentEntry قبل أي سطح.
 */
let hqDocumentEntry = false;

export function markHqDocumentEntry(): void {
    hqDocumentEntry = true;
}

export function isHqDocumentEntry(): boolean {
    return hqDocumentEntry;
}

export function resetHamiProductRuntimeForTests(): void {
    hqDocumentEntry = false;
}
