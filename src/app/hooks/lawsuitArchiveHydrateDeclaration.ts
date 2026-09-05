/**
 * متى نغادر هيكل بطاقات مخزن الدعاوى.
 * المهلة أو المفاتيح الباردة لا تبرّران فتحات دائمة: إما بطاقات، أو فراغ صادق، أو تشفير محجوب.
 */
export function resolveLawsuitArchiveHydrateDeclaration(input: {
    hasVisibleRecords: boolean;
    mayDeclareHydrated: boolean;
    decryptBlocked: boolean;
    stillColdAfterHydrate: boolean;
    diskHydrationSettled: boolean;
}): { declareHydrated: boolean; markDecryptBlocked: boolean } {
    if (input.hasVisibleRecords) {
        return { declareHydrated: true, markDecryptBlocked: false };
    }
    if (input.mayDeclareHydrated) {
        return { declareHydrated: true, markDecryptBlocked: input.decryptBlocked };
    }
    if (input.decryptBlocked) {
        return { declareHydrated: true, markDecryptBlocked: true };
    }
    if (input.diskHydrationSettled) {
        return {
            declareHydrated: true,
            markDecryptBlocked: input.stillColdAfterHydrate,
        };
    }
    return { declareHydrated: false, markDecryptBlocked: false };
}
