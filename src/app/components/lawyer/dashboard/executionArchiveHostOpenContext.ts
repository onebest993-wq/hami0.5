import { createContext } from 'react';

/**
 * قشرة مخزن التنفيذ keep-alive تبقى مركّبة ومخفية.
 * حوارات التأكيد تُبوَّب إلى document.body حتى لا ترث visibility:hidden —
 * لذلك يجب معرفة ما إذا كانت القشرة مفتوحة فعلاً قبل عرضها فوق الرئيسية.
 * الافتراضي true: الأسطح/الاختبارات بلا InstantChrome تبقى تعرض الحوار.
 */
export const ExecutionArchiveHostOpenContext = createContext(true);
