import type { FollowupSpecializationVisibility } from '@/app/utils/followupSpecializationVisibility';
import type { FollowupModalTabId } from './useExecutionDashboardFollowupTabAssembly';

export type FollowupModalTabEntry = {
    id: FollowupModalTabId;
    label: string;
};

type FollowupTabSpecializationSlice = Pick<
    FollowupSpecializationVisibility,
    'hideFollowupCoerciveTab' | 'hideFollowupSeizureRequestsTab'
>;

export type BuildFollowupModalTabsInput = {
    specialization: FollowupTabSpecializationSlice & Pick<
        FollowupSpecializationVisibility,
        'hidePersonalCoerciveFollowupTab'
    >;
    /** تبويب شخصي ظاهر (بعد بوابة الكاسب/التخصيص) */
    showPersonalCoerciveFollowupTab: boolean;
    personalTabLockedForEmployee: boolean;
    followupTabsRestricted: boolean;
};

export function buildFollowupModalTabsFromFlags(input: BuildFollowupModalTabsInput): FollowupModalTabEntry[] {
    const tabs: FollowupModalTabEntry[] = [];
    if (input.showPersonalCoerciveFollowupTab && !input.followupTabsRestricted) {
        tabs.push({
            id: 'personal',
            label: input.personalTabLockedForEmployee
                ? '🔒 التنفيذ الجبري الشخصي'
                : 'التنفيذ الجبري الشخصي',
        });
    }
    if (!input.specialization.hideFollowupCoerciveTab) {
        tabs.push({ id: 'coercive', label: 'الإجراءات الجبرية' });
    }
    if (!input.followupTabsRestricted && !input.specialization.hideFollowupSeizureRequestsTab) {
        tabs.push({ id: 'seizure_requests', label: 'طلبات الحجز المالية' });
    }
    tabs.push(
        { id: 'correspondences', label: 'المخاطبات' },
        { id: 'admin', label: 'نماذج الطلبات' },
        { id: 'dossier_controls', label: 'التحكم في الإضبارة' },
        { id: 'other_party', label: 'تحركات الطرف الآخر' },
    );
    return tabs;
}

export type BuildFollowupSectionTabOrderInput = {
    showPersonalCoerciveFollowupTab: boolean;
    specialization: FollowupTabSpecializationSlice;
    followupTabsRestricted: boolean;
};

export function buildFollowupSectionTabOrderFromFlags(
    input: BuildFollowupSectionTabOrderInput,
): readonly FollowupModalTabId[] {
    return [
        ...(input.showPersonalCoerciveFollowupTab && !input.followupTabsRestricted ? (['personal'] as const) : []),
        ...(input.specialization.hideFollowupCoerciveTab ? [] : (['coercive'] as const)),
        ...(input.followupTabsRestricted || input.specialization.hideFollowupSeizureRequestsTab
            ? []
            : (['seizure_requests'] as const)),
        'correspondences',
        'admin',
        'dossier_controls',
        'other_party',
    ];
}
