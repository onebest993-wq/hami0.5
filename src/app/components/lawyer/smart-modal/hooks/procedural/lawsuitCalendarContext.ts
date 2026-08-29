import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';

export function buildLawsuitCalendarContext(
    parentData: UseSmartFileProceduralActionsOptions['parentData'],
    calendarUserId: UseSmartFileProceduralActionsOptions['calendarUserId'],
) {
    const parties = parentData?.parties;
    const firstParty =
        Array.isArray(parties) && parties[0] && typeof parties[0] === 'object'
            ? (parties[0] as { name?: string })
            : null;
    return {
        userId: resolveCalendarUserId(calendarUserId),
        fileId: String(parentData?.id ?? ''),
        caseNo: typeof parentData?.caseNo === 'string' ? parentData.caseNo : undefined,
        court: typeof parentData?.court === 'string' ? parentData.court : undefined,
        parties,
        clientName: firstParty?.name?.trim() || undefined,
    };
}
