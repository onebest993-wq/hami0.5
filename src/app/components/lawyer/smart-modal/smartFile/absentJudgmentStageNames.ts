/** مرحلة نظر الاعتراض على الحكم الغيابي (بعد فتح إضبارة الاعتراض). */
export function isAbsentObjectionStageName(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    return s.includes('اعتراض على الحكم الغيابي') || s.includes('اعتراض غيابي');
}
