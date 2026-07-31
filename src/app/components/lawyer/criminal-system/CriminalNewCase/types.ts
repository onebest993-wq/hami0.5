export type CriminalNewCaseProps = {
    onCreated: (caseId: string) => void;
    onBack?: () => void;
    onClose?: () => void;
    /** نموذج تعبئة الإضبارة المفرّقة — منفصل عن إنشاء إضبارة جزائية عادية. */
    severanceFormMode?: boolean;
    /** داخل لوحة الإضبارة الأم — تمرير داخلي بدل شاشة كاملة منفصلة. */
    embeddedOverlay?: boolean;
};
