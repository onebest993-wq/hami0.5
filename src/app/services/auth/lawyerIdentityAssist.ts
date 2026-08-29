/** فحص حضور صور الوجه/الهوية — ليس مطابقة بيومترية ولا استخراج نص. */

export function assessFaceAssistPresence(params: {
    idFrontDataUrl: string | null;
    faceSelfieDataUrl: string | null;
}): { ready: boolean; note: string } {
    if (!params.idFrontDataUrl) {
        return { ready: false, note: 'صورة هوية النقابة مطلوبة قبل الصورة الإضافية.' };
    }
    if (!params.faceSelfieDataUrl) {
        return { ready: false, note: 'أرفق الصورة الإضافية أو تخطَّ الخطوة.' };
    }
    if (params.faceSelfieDataUrl.length < 800) {
        return { ready: false, note: 'الصورة قصيرة جداً — أعد الالتقاط.' };
    }
    return {
        ready: true,
        note: 'تم حفظ الصورة الإضافية مع هوية النقابة للمراجعة البشرية. لا يُعتمد الحساب إلا من الإدارة.',
    };
}
