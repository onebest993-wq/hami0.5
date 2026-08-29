import fs from 'node:fs';

const p =
    'src/app/components/lawyer/execution/partyInteractiveBadges/ExecutionPartyInteractiveBadges.tsx';
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
const start = lines.findIndex((l) => l.includes('const extraDefs = useMemo'));
const end = lines.findIndex((l, i) => i > start && l.includes('const allDefs = useMemo'));
const block = lines.slice(start, end).join('\n');
const m = block.match(/const extraDefs = useMemo\(\(\) => (\{[\s\S]*\n    \}), \[([\s\S]*?)\]\);?\s*$/);
if (!m) {
    console.error('parse failed');
    process.exit(1);
}
const body = m[1];
const depsRaw = m[2];

const extracted = `import { Calendar } from '@/app/components/ui/icons/Calendar';
import { FileText } from '@/app/components/ui/icons/FileText';
import { Newspaper } from '@/app/components/ui/icons/Newspaper';
import { Shield } from '@/app/components/ui/icons/Shield';
import { Timer } from '@/app/components/ui/icons/Timer';
import { UserX } from '@/app/components/ui/icons/UserX';
import { parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import { resolvePrimaryDebtorCoerciveStack } from '../coerciveStackUtils';
import { formatDateAr } from './badgeDisplayHelpers';
import {
    absenceBadgeKey,
    evictionGraceBadgeKey,
    guarantorFollowupKey,
    policeAssistanceBadgeKey,
    regularTablighBadgeKey,
} from './badgeSignalKeys';
import type { ExecutionPartyInteractiveBadgesProps, PartyInteractiveBadge } from './types';

export type BuildExtraPartyBadgeDefinitionsInput = {
    party: ExecutionPartyInteractiveBadgesProps['party'];
    isPrimaryDebtor: boolean;
    executionData: ExecutionPartyInteractiveBadgesProps['executionData'] | null | undefined;
    memoBadge: ExecutionPartyInteractiveBadgesProps['memoBadge'];
    publicationNoticeBadge: ExecutionPartyInteractiveBadgesProps['publicationNoticeBadge'];
    regularTablighBadge: ExecutionPartyInteractiveBadgesProps['regularTablighBadge'];
    absenceBadge: ExecutionPartyInteractiveBadgesProps['absenceBadge'];
    evictionGraceBadge: ExecutionPartyInteractiveBadgesProps['evictionGraceBadge'];
    policeAssistanceBadge: ExecutionPartyInteractiveBadgesProps['policeAssistanceBadge'];
    showSummonsBadge: boolean;
    onMemoActivate?: ExecutionPartyInteractiveBadgesProps['onMemoActivate'];
    onPublicationNoticeActivate?: ExecutionPartyInteractiveBadgesProps['onPublicationNoticeActivate'];
    onRegularTablighActivate?: ExecutionPartyInteractiveBadgesProps['onRegularTablighActivate'];
    onAbsenceActivate?: ExecutionPartyInteractiveBadgesProps['onAbsenceActivate'];
    onEvictionGraceActivate?: ExecutionPartyInteractiveBadgesProps['onEvictionGraceActivate'];
    onPoliceAssistanceActivate?: ExecutionPartyInteractiveBadgesProps['onPoliceAssistanceActivate'];
    onSummonsActivate?: ExecutionPartyInteractiveBadgesProps['onSummonsActivate'];
    onGuarantorFollowupActivate?: ExecutionPartyInteractiveBadgesProps['onGuarantorFollowupActivate'];
    onOpenGuarantorDetails?: ExecutionPartyInteractiveBadgesProps['onOpenGuarantorDetails'];
    guarantorFollowupAwaitingDetails: boolean;
    executionBadgeKey: string;
    executionId: string | undefined;
    debtorAttendedVoluntarilyProp: ExecutionPartyInteractiveBadgesProps['debtorAttendedVoluntarily'];
    voluntaryAttendanceCountProp: ExecutionPartyInteractiveBadgesProps['voluntaryAttendanceCount'];
    personalCoerciveDecisionBadges: ExecutionPartyInteractiveBadgesProps['personalCoerciveDecisionBadges'];
    debtorArrested: boolean;
    forcedAttendancePending: boolean;
    taklifAssignmentSignalKey: string;
    onTaklifAssignmentActivate?: ExecutionPartyInteractiveBadgesProps['onTaklifAssignmentActivate'];
    activeDebtorKey: string | undefined;
    primaryDebtorKey: string | undefined;
    publicationNoticeSignalKey: string;
};

/** Extra (non-base) interactive badge definitions for the party strip. */
export function buildExtraPartyBadgeDefinitions(
    input: BuildExtraPartyBadgeDefinitionsInput,
): PartyInteractiveBadge[] {
    const {
        party,
        isPrimaryDebtor,
        executionData: ed,
        memoBadge,
        publicationNoticeBadge,
        regularTablighBadge,
        absenceBadge,
        evictionGraceBadge,
        policeAssistanceBadge,
        showSummonsBadge,
        onMemoActivate,
        onPublicationNoticeActivate,
        onRegularTablighActivate,
        onAbsenceActivate,
        onEvictionGraceActivate,
        onPoliceAssistanceActivate,
        onSummonsActivate,
        onGuarantorFollowupActivate,
        onOpenGuarantorDetails,
        guarantorFollowupAwaitingDetails,
        executionBadgeKey,
        executionId,
        debtorAttendedVoluntarilyProp,
        voluntaryAttendanceCountProp,
        personalCoerciveDecisionBadges,
        debtorArrested,
        forcedAttendancePending,
        taklifAssignmentSignalKey,
        onTaklifAssignmentActivate,
        activeDebtorKey,
        primaryDebtorKey,
    } = input;

    return (() => ${body})();
}
`;

// The body uses executionDataRef.current as `ed` - need to fix
const extractedFixed = extracted.replace(
    'const ed = executionDataRef.current;',
    '/* ed from input */',
);

fs.writeFileSync(
    'src/app/components/lawyer/execution/partyInteractiveBadges/buildExtraPartyBadgeDefinitions.ts',
    extractedFixed,
);

// Replace in main file
const before = lines.slice(0, start).join('\n');
const after = lines.slice(end).join('\n');
const replacement = `    const extraDefs = useMemo(
        () =>
            buildExtraPartyBadgeDefinitions({
                party,
                isPrimaryDebtor,
                executionData: executionDataRef.current,
                memoBadge,
                publicationNoticeBadge,
                regularTablighBadge,
                absenceBadge,
                evictionGraceBadge,
                policeAssistanceBadge,
                showSummonsBadge,
                onMemoActivate,
                onPublicationNoticeActivate,
                onRegularTablighActivate,
                onAbsenceActivate,
                onEvictionGraceActivate,
                onPoliceAssistanceActivate,
                onSummonsActivate,
                onGuarantorFollowupActivate,
                onOpenGuarantorDetails,
                guarantorFollowupAwaitingDetails,
                executionBadgeKey,
                executionId,
                debtorAttendedVoluntarilyProp,
                voluntaryAttendanceCountProp,
                personalCoerciveDecisionBadges,
                debtorArrested,
                forcedAttendancePending,
                taklifAssignmentSignalKey,
                onTaklifAssignmentActivate,
                activeDebtorKey,
                primaryDebtorKey,
                publicationNoticeSignalKey,
            }),
        [
${depsRaw}
        ],
    );

`;

let main = `${before}\n${replacement}${after}\n`;
if (!main.includes("from './buildExtraPartyBadgeDefinitions'")) {
    main = main.replace(
        "import { buildPartyBadgeDefinitions } from './buildPartyBadgeDefinitions';",
        "import { buildPartyBadgeDefinitions } from './buildPartyBadgeDefinitions';\nimport { buildExtraPartyBadgeDefinitions } from './buildExtraPartyBadgeDefinitions';",
    );
}
fs.writeFileSync(p, main);
console.log({
    extracted: extractedFixed.split('\n').length,
    main: main.split('\n').length,
});
