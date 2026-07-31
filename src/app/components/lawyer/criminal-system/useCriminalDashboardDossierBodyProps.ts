import type { CriminalDashboardDossierBodyProps } from './CriminalDashboardDossierBody';

/**
 * يبني كائن الخصائص (props bag) الكامل لـ `CriminalDashboardDossierBody` من مُخرَجات الـ hooks/الحالة
 * المحلية في الـ runtime — بلا أي منطق جديد؛ فقط فصل تجميع الخصائص عن نقطة الاستدعاء لتقليص حجم
 * composition root. الشكل مضبوط عبر `CriminalDashboardDossierBodyProps` نفسه (نفس النوع المستخدم في JSX).
 */
export function useCriminalDashboardDossierBodyProps(
    props: CriminalDashboardDossierBodyProps,
): CriminalDashboardDossierBodyProps {
    return props;
}
