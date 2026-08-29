/** الطرف المعلّم موكلاً — isClient أو مكتبي */
export function resolveClientMarkedParty(
    parties?: Array<{
        role?: string;
        isClient?: boolean;
        side?: 'right' | 'left';
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    }>,
) {
    if (!Array.isArray(parties)) return null;
    return (
        parties.find(
            (p) => p.isClient || p.lawyer?.isMyOffice || p.isMyOffice,
        ) ?? null
    );
}
