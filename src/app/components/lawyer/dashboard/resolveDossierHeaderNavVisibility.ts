/** زر واحد فقط: رجوع للتنقل المتداخل، أو إغلاق للوضع النافذي/الملء الشاشة */
export function resolveDossierHeaderNavVisibility(nestedNavigation: boolean): {
    showBack: boolean;
    showExit: boolean;
} {
    return nestedNavigation
        ? { showBack: true, showExit: false }
        : { showBack: false, showExit: true };
}
