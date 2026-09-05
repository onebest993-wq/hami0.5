/**
 * إن رُفع المرفق ثم فشل حفظ المسودة — احذف وثيقة المخزن حتى لا تبقى يتيمة.
 * لا يُستدعى بعد نجاح onSaveNote (حتى لو فشل التثبيت لاحقاً).
 */
export async function discardOrphanComposeAttachment(params: {
    docId: string | undefined;
    uid: string;
    deleteDoc: (docId: string, authorId: string) => Promise<void>;
    refreshDocs: () => Promise<void>;
}): Promise<void> {
    const docId = params.docId?.trim();
    const uid = params.uid.trim();
    if (!docId || !uid) return;
    await params.deleteDoc(docId, uid);
    await params.refreshDocs();
}
