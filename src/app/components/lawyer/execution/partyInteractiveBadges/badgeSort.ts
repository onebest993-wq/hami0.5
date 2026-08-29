/** ترتيب ثابت للشارات — المهل والسياق القانوني أولاً، ثم الجبري الشخصي، ثم المالي */
const BADGE_DISPLAY_ORDER: Record<string, number> = {
    stay_of_execution: 10,
    death_creditor: 15,
    death_debtor: 16,
    employment_termination: 18,
    memo_notice: 22,
    publication_notice: 23,
    debtor_absence: 24,
    summons_attendance: 26,
    taklif_attendance: 27,
    executive_detention: 32,
    executive_detention_pending_confirm: 33,
    executive_detention_request: 34,
    debtor_arrested: 36,
    arrest_warrant: 38,
    forced_attendance: 40,
    eviction_grace: 41,
    eviction_police_assistance: 42,
    travel_ban: 44,
    travel_ban_pending: 45,
    travel_ban_approved_inactive: 46,
    salary_garnishment: 55,
    real_estate_seizure: 56,
    property_seizure: 56,
    vehicle_seizure: 57,
    movable_seizure: 58,
    seizure_released_row: 59,
    seizure_sold_row: 60,
};

export function badgeSortOrder(id: string): number {
    if (BADGE_DISPLAY_ORDER[id] != null) return BADGE_DISPLAY_ORDER[id];
    if (id.startsWith('seizure_released_')) return BADGE_DISPLAY_ORDER.seizure_released_row;
    if (id.startsWith('seizure_sold_')) return BADGE_DISPLAY_ORDER.seizure_sold_row;
    return 75;
}
