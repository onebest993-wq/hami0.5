import { useEffect } from 'react';

/**
 * يجعل حالة React تتبنّى القيمة المحفوظة في ملف التنفيذ في حالتين:
 * 1) تغيّر هوية الملف النشط (فتح/تبديل إضبارة أو ملف إنابة داخل نفس التركيب).
 * 2) تغيّر القيمة المحفوظة نفسها (كتابة خارجية عبر persistExecutionMerge
 *    من محضر المتابعة أو أي مسار آخر).
 *
 * بدون هذا التبنّي يتباعد مصدرا الحقيقة (حالة React مقابل بيانات الملف)،
 * فيُعيد حفظُ اللقطة عند الإغلاق بعثَ أعلامٍ أُطفئت أو محوَ أعلامٍ سُجّلت
 * فعلاً — وهو مصدر شارات «ظهرت من تلقاء نفسها».
 *
 * ملاحظة: تغييرات الحالة عبر الـ setters وحدها (دون كتابة في الملف) تبقى
 * محفوظة — لا يعمل هذا الـ effect إلا إذا تغيّرت الهوية أو القيمة المحفوظة.
 */
export function useAdoptPersistedExecutionValue<T>(
    executionDataId: string | undefined,
    persistedValue: T,
    setState: (v: T) => void,
): void {
    useEffect(() => {
        setState(persistedValue);
    }, [executionDataId, persistedValue, setState]);
}
