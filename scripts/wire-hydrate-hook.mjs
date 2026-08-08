import fs from 'fs';

const path = 'src/app/components/lawyer/Dashboard_Active_Order_File/ActiveOrderFileRoot.tsx';
let s = fs.readFileSync(path, 'utf8');

if (!s.includes('useOrderFileHydrate')) {
    s = s.replace(
        "import { useOrderFileMetaPartyEdit } from './hooks/useOrderFileMetaPartyEdit';",
        "import { useOrderFileMetaPartyEdit } from './hooks/useOrderFileMetaPartyEdit';\nimport { useOrderFileHydrate } from './hooks/useOrderFileHydrate';",
    );
}

const start = s.indexOf('    const defenderEntryHydrateRef = useRef(false);');
const end = s.indexOf('    const shouldSkipExecutionStep = useMemo(() => {');
if (start < 0 || end < 0) {
    console.error('markers not found', { start, end });
    process.exit(1);
}

const hookCall = `    useOrderFileHydrate({
        caseId,
        userId,
        fileData,
        caseData,
        setters: {
            setCaseData,
            setHasIntervention,
            setFileStatus,
            setIsSecretMode,
            setActiveLifecycleStep,
            setJudgeDecision,
            setExecutionData,
            setGrievanceData,
            setGrievanceLegalEndDate,
            setGrievanceDecisionNotificationConfirmed,
            setGrievancePetitionNotificationDate,
            setGrievancePetitionNotificationConfirmed,
            setGrievanceTimingConfirmed,
            setGrievanceDetailsConfirmed,
            setPhase2FirstHearingDate,
            setGrievanceDecision,
            setCassationData,
            setCassationDecision,
            setGuaranteeSubmitted,
            setGuaranteeDetails,
            setHearings,
            setExpertModule,
            setPreDecisionClosed,
            setExpectedDecisionDate,
            setRegistrationData,
            setCaseEvents,
            setCaseNotes,
            setCaseAttachments,
            setCaseFollowups,
        },
    });

`;

s = s.slice(0, start) + hookCall + s.slice(end);
fs.writeFileSync(path, s);
console.log('wired hydrate hook', { removedLines: end - start, newLen: s.split('\n').length });
