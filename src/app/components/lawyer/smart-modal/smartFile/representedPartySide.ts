/** وكيل المدعى عليه — يحق له الاعتراض على الحكم الغيابي. */
export function isDefendantRepresentedParty(representedParty?: string | null): boolean {
    const rp = String(representedParty ?? '').trim();
    if (!rp) return false;
    return rp.includes('مدعى');
}

/** وكيل المدعي — انتظار طعن الخصم بعد حكم لصالح موكله. */
export function isPlaintiffRepresentedParty(representedParty?: string | null): boolean {
    const rp = String(representedParty ?? '').trim();
    if (!rp) return false;
    return rp.includes('مدعي') && !rp.includes('مدعى');
}
