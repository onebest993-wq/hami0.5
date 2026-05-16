import fs from 'fs';

const p = 'src/app/components/lawyer/Dashboard_Active_Order_File/ActiveOrderFileRoot.tsx';
let lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

const padStart = lines.findIndex((l) => l.includes('const pad2 = (n: number)'));
const stateMgmt = lines.findIndex((l) => l.includes('// 🔥 STATE MANAGEMENT'));
if (padStart >= 0 && stateMgmt > padStart) {
    lines.splice(padStart, stateMgmt - padStart, '    const todayYmdValue = todayYmd();', '');
    console.log('removed helpers', stateMgmt - padStart);
}

const partyStart = lines.findIndex((l) => l.trim() === 'const PartyCardItem = ({');
const openParty = lines.findIndex((l) => l.trim().startsWith('const openPartyEdit ='));
if (partyStart >= 0 && openParty > partyStart) {
    lines.splice(partyStart, openParty - partyStart);
    console.log('removed PartyCardItem', openParty - partyStart);
}

const gStart = lines.findIndex((l) => l.includes('const getDynamicPartyLabels = (procedureType'));
const gEnd = lines.findIndex((l, i) => i > gStart && l.includes('const partyLabels = useMemo'));
if (gStart >= 0 && gEnd > gStart) {
    lines.splice(gStart, gEnd - gStart);
    console.log('removed getDynamicPartyLabels');
}

let s = lines.join('\n');

if (!s.includes('PRE_DECISION_OUTCOME_CLOSE')) {
    s = s.replace(
        "from './utils/hearingRules';",
        `from './utils/hearingRules';
import {
    PRE_DECISION_OUTCOME_ADJOURN,
    PRE_DECISION_OUTCOME_CLOSE,
    PRE_DECISION_OUTCOME_NULLIFY,
} from './constants/hearingOutcomes';`,
    );
}

if (!s.includes('HearingStage,')) {
    s = s.replace(
        '    JudgeDecision,\n} from \'./types\';',
        `    JudgeDecision,
    HearingStage,
    CaseNote,
    CaseAttachment,
    CaseFollowup,
    PreDecisionHearingOutcomeKind,
} from './types';`,
    );
}

s = s.replace(
    'export const Dashboard_Active_Order_File: React.FC<ActiveOrderFileProps> = ({ fileData, onClose, onCaseUpdated }) => {\n    const { user: authUser } = useAuth();\n    const userId = authUser?.id || \'dev-user-uuid-1\';\n    const caseId = typeof fileData?.id === \'string\' ? fileData.id : null;\n    const defaultDeadlineDays = fileData?.type === \'urgent_action\' ? 7 : 3;\n    const [caseData, setCaseData] = useState<any>(fileData);',
    `export const Dashboard_Active_Order_File: React.FC<ActiveOrderFileProps> = ({ fileData, onClose, onCaseUpdated }) => {
    const fd = fileData as Record<string, unknown>;
    const { user: authUser } = useAuth();
    const userId = authUser?.id || 'dev-user-uuid-1';
    const caseId = typeof fd?.id === 'string' ? fd.id : null;
    const defaultDeadlineDays = fd?.type === 'urgent_action' ? 7 : 3;
    const [caseData, setCaseData] = useState<any>(fd);`,
);

fs.writeFileSync(p, s);
console.log('cleanup complete');
