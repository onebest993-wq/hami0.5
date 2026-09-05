/** الطرف المعلّم موكلاً — isClient أو مكتبي */
export function resolveClientMarkedParty<
    T extends {
        isClient?: boolean;
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    },
>(parties?: T[] | null): T | null {
    if (!Array.isArray(parties)) return null;
    return (
        parties.find(
            (p) => p.isClient || p.lawyer?.isMyOffice || p.isMyOffice,
        ) ?? null
    );
}
