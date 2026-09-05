import { isAppealStageName } from './judgmentStageNames';

export type ExtraordinaryPleadingCourtLayer = 'بداءة' | 'استئناف';

/** طبقة المحكمة التي يُقيَّد عليها الطعن الاستثنائي في اسم المرحلة. */
export function extraordinaryPleadingCourtLayerLabel(
    sourceStageName?: string | null,
): ExtraordinaryPleadingCourtLayer {
    const s = String(sourceStageName ?? '').trim();
    if (/\(\s*استئناف\s*\)/.test(s)) return 'استئناف';
    if (isAppealStageName(s)) return 'استئناف';
    return 'بداءة';
}

/**
 * اسم مرحلة المرافعة للطعن الاستثنائي: اعتراض الغير (بداءة) / إعادة المحاكمة (استئناف).
 */
export function qualifyExtraordinaryPleadingStageName(
    appealType: string,
    sourceStageName?: string | null,
): string {
    const t = String(appealType ?? '').trim();
    const layer = extraordinaryPleadingCourtLayerLabel(sourceStageName);
    if (t.includes('إعادة محاكمة') || t.includes('إعادة المحاكمة')) {
        return `إعادة المحاكمة (${layer})`;
    }
    if (t.includes('اعتراض الغير') || t.includes('حكم الغير')) {
        return `اعتراض الغير (${layer})`;
    }
    if (t.includes('اعتراض')) {
        return 'اعتراض على الحكم الغيابي (بداءة)';
    }
    return t;
}
