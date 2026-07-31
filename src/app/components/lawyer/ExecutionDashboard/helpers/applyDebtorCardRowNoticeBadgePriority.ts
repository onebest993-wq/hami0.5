/**
 * أولوية شارات الإخطار/التبليغ لصف المدين — منطق خالص قابل للاختبار.
 * الترتيب: تكليف موظف > نشر > مذكرة > تبليغ اعتيادي؛ وتمثيل المدين يخفي الكل.
 * شارة «غير مبلّغ» تُحسم هنا أيضاً: تختفي متى وُجد أي مسار تبليغ فعّال
 * (تكليف، نشر، مذكرة، علامة تبليغ) حتى لا تتناقض مع بقية الشارات.
 */
export type DebtorCardRowNoticeBadgePriorityInput<TMemo, TPub, TTabligh, TTaklif> = {
    rowIsDeceased: boolean;
    isRepresentingDebtor: boolean;
    rowTaklifAssignmentBadge: TTaklif | null;
    rowPublicationNoticeBadge: TPub | null;
    primaryMemoNoticeBadge: TMemo | null;
    isPrimary: boolean;
    hasSummonsMarker: boolean;
    regularTablighBadge: TTabligh | null;
    showUnservedMemoBadge: boolean;
};

export type DebtorCardRowNoticeBadgePriorityResult<TMemo, TPub, TTabligh, TTaklif> = {
    rowMemoNoticeBadge: TMemo | null;
    rowShowSummonsBadge: boolean;
    rowRegularTablighBadge: TTabligh | null;
    rowPublicationNoticeBadgeResolved: TPub | null;
    rowTaklifAssignmentBadge: TTaklif | null;
    rowShowUnservedMemoBadge: boolean;
};

export function applyDebtorCardRowNoticeBadgePriority<TMemo, TPub, TTabligh, TTaklif>(
    input: DebtorCardRowNoticeBadgePriorityInput<TMemo, TPub, TTabligh, TTaklif>,
): DebtorCardRowNoticeBadgePriorityResult<TMemo, TPub, TTabligh, TTaklif> {
    const {
        rowIsDeceased,
        isRepresentingDebtor,
        rowTaklifAssignmentBadge,
        rowPublicationNoticeBadge,
        primaryMemoNoticeBadge,
        isPrimary,
        hasSummonsMarker,
        regularTablighBadge,
        showUnservedMemoBadge,
    } = input;

    let rowMemoNoticeBadge: TMemo | null =
        isPrimary && !rowIsDeceased ? primaryMemoNoticeBadge : null;
    let rowShowSummonsBadge = !rowIsDeceased && Boolean(hasSummonsMarker);
    let rowRegularTablighBadge: TTabligh | null =
        !rowIsDeceased ? regularTablighBadge : null;
    let rowPublicationNoticeBadgeResolved: TPub | null = rowIsDeceased
        ? null
        : rowPublicationNoticeBadge;

    if (rowTaklifAssignmentBadge) {
        rowMemoNoticeBadge = null;
        rowPublicationNoticeBadgeResolved = null;
        rowShowSummonsBadge = false;
        rowRegularTablighBadge = null;
    } else if (rowPublicationNoticeBadgeResolved) {
        rowMemoNoticeBadge = null;
        rowShowSummonsBadge = false;
        rowRegularTablighBadge = null;
    } else if (rowMemoNoticeBadge) {
        rowShowSummonsBadge = false;
        rowRegularTablighBadge = null;
    } else if (rowRegularTablighBadge) {
        rowShowSummonsBadge = true;
    }

    if (isRepresentingDebtor) {
        rowShowSummonsBadge = false;
        rowRegularTablighBadge = null;
        rowMemoNoticeBadge = null;
        rowPublicationNoticeBadgeResolved = null;
    }

    const anyNoticePathActive = Boolean(
        rowTaklifAssignmentBadge ||
            rowPublicationNoticeBadgeResolved ||
            rowMemoNoticeBadge ||
            rowRegularTablighBadge ||
            hasSummonsMarker,
    );
    const rowShowUnservedMemoBadge =
        showUnservedMemoBadge &&
        !rowIsDeceased &&
        !isRepresentingDebtor &&
        !anyNoticePathActive;

    return {
        rowMemoNoticeBadge,
        rowShowSummonsBadge,
        rowRegularTablighBadge,
        rowPublicationNoticeBadgeResolved,
        rowTaklifAssignmentBadge,
        rowShowUnservedMemoBadge,
    };
}
