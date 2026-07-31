import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MAIN_FILE = path.resolve(__dirname, '../../ExecutionCreationView.tsx');
const COMPONENTS_DIR = path.resolve(__dirname, '../components');
const HOOKS_DIR = path.resolve(__dirname, '../hooks');
const TYPES_FILE = path.resolve(__dirname, '../types.ts');
const SUBMIT_HOOK_FILE = path.resolve(HOOKS_DIR, 'useExecutionCreationSubmit.ts');
const FORM_STATE_HOOK_FILE = path.resolve(HOOKS_DIR, 'useExecutionCreationFormState.ts');
const CLAIM_CASCADE_HOOK_FILE = path.resolve(HOOKS_DIR, 'useExecutionCreationClaimCascade.ts');
const PARTY_ACTIONS_HOOK_FILE = path.resolve(HOOKS_DIR, 'useExecutionCreationPartyActions.ts');

const mainFileSource = fs.readFileSync(MAIN_FILE, 'utf8');
const MAIN_FILE_LINE_COUNT = mainFileSource.split('\n').length;

/**
 * كل نص مميّز يخص أحد الأقسام/المودالات المستخرجة — يجب أن يبقى داخل مكوّنه
 * الجديد فقط ولا يتكرر كتعليق أو نص منطقي آخر في الملف الرئيسي.
 */
const EXTRACTED_COMPONENT_MARKERS: Array<{ file: string; marker: string }> = [
    { file: 'InstrumentDetailsSection.tsx', marker: 'بيانات الحجة الشرعية' },
    { file: 'LawyerFeesToggleCard.tsx', marker: 'المطالبة بأتعاب المحاماة المحكوم بها' },
    { file: 'ExecutionIntakeModals.tsx', marker: 'فحص الغياب الإلزامي' },
];

describe('ExecutionCreationView Phase-1 split — component extraction', () => {
    it.each(EXTRACTED_COMPONENT_MARKERS)(
        '$file exists and owns its distinctive marker',
        ({ file, marker }) => {
            const filePath = path.join(COMPONENTS_DIR, file);
            expect(fs.existsSync(filePath)).toBe(true);
            const source = fs.readFileSync(filePath, 'utf8');
            expect(source).toContain(marker);
        },
    );

    it('main ExecutionCreationView.tsx no longer contains the extracted markers', () => {
        for (const { marker } of EXTRACTED_COMPONENT_MARKERS) {
            expect(mainFileSource).not.toContain(marker);
        }
    });

    it('main ExecutionCreationView.tsx imports the extracted components', () => {
        expect(mainFileSource).toContain(
            "import { InstrumentDetailsSection } from './ExecutionCreationView/components/InstrumentDetailsSection';",
        );
        expect(mainFileSource).toContain(
            "import { LawyerFeesToggleCard } from './ExecutionCreationView/components/LawyerFeesToggleCard';",
        );
        expect(mainFileSource).toContain(
            "import { ExecutionIntakeModals } from './ExecutionCreationView/components/ExecutionIntakeModals';",
        );
    });

    it('main ExecutionCreationView.tsx renders the extracted components', () => {
        expect(mainFileSource).toContain('<InstrumentDetailsSection');
        expect(mainFileSource).toContain('<LawyerFeesToggleCard');
        expect(mainFileSource).toContain('<ExecutionIntakeModals');
    });

    it('PartiesSection and other pre-existing extractions remain untouched', () => {
        expect(fs.existsSync(path.join(COMPONENTS_DIR, 'PartiesSection.tsx'))).toBe(true);
        expect(mainFileSource).toContain(
            "import { PartiesSection } from './ExecutionCreationView/components/PartiesSection';",
        );
    });
});

describe('ExecutionCreationView Phase-1 split — submit handler extraction', () => {
    const submitHookSource = fs.readFileSync(SUBMIT_HOOK_FILE, 'utf8');

    it('useExecutionCreationSubmit.ts exists and exports the submit hook', () => {
        expect(fs.existsSync(SUBMIT_HOOK_FILE)).toBe(true);
        expect(submitHookSource).toContain('export function useExecutionCreationSubmit');
        expect(submitHookSource).toContain('handleSubmit');
    });

    it('main ExecutionCreationView.tsx imports and uses useExecutionCreationSubmit', () => {
        expect(mainFileSource).toContain(
            "import { useExecutionCreationSubmit } from './ExecutionCreationView/hooks/useExecutionCreationSubmit';",
        );
        expect(mainFileSource).toContain('} = useExecutionCreationSubmit({');
    });

    it('handleSubmit validation body is no longer defined inline in the main file', () => {
        expect(mainFileSource).not.toMatch(/const handleSubmit = async \(\) => \{/);
        expect(mainFileSource).not.toContain('يرجى كتابة اسم مديرية التنفيذ');
    });
});

describe('ExecutionCreationView Phase-1 split — shared types extraction', () => {
    const typesSource = fs.readFileSync(TYPES_FILE, 'utf8');

    it('types.ts exists and exports the shared domain types', () => {
        expect(fs.existsSync(TYPES_FILE)).toBe(true);
        for (const symbol of [
            'CreditorDraft',
            'DebtorDraft',
            'AdditionalCreditorDraft',
            'AdditionalDebtorDraft',
            'ExecutionTargetOption',
            'ExecutionDraftRecord',
            'AbsenteeChecks',
        ]) {
            expect(typesSource).toContain(`export type ${symbol}`);
        }
    });

    it('main ExecutionCreationView.tsx no longer declares the shared domain types locally', () => {
        expect(mainFileSource).not.toMatch(/type CreditorDraft = \{/);
        expect(mainFileSource).not.toMatch(/type ExecutionDraftRecord =/);
    });

    it('the extracted form-state hook imports the shared domain types', () => {
        const formStateSource = fs.readFileSync(FORM_STATE_HOOK_FILE, 'utf8');
        expect(formStateSource).toContain("from '../types'");
    });
});

describe('ExecutionCreationView Phase-2 split — state, cascade & party-action hooks', () => {
    it('useExecutionCreationFormState.ts exists and exports the form-state hook', () => {
        expect(fs.existsSync(FORM_STATE_HOOK_FILE)).toBe(true);
        const source = fs.readFileSync(FORM_STATE_HOOK_FILE, 'utf8');
        expect(source).toContain('export function useExecutionCreationFormState');
    });

    it('useExecutionCreationClaimCascade.ts exists and exports the claim-cascade hook', () => {
        expect(fs.existsSync(CLAIM_CASCADE_HOOK_FILE)).toBe(true);
        const source = fs.readFileSync(CLAIM_CASCADE_HOOK_FILE, 'utf8');
        expect(source).toContain('export function useExecutionCreationClaimCascade');
    });

    it('useExecutionCreationPartyActions.ts exists and exports the party-actions hook', () => {
        expect(fs.existsSync(PARTY_ACTIONS_HOOK_FILE)).toBe(true);
        const source = fs.readFileSync(PARTY_ACTIONS_HOOK_FILE, 'utf8');
        expect(source).toContain('export function useExecutionCreationPartyActions');
    });

    it('main ExecutionCreationView.tsx imports and uses the three Phase-2 hooks', () => {
        expect(mainFileSource).toContain(
            "import { useExecutionCreationFormState } from './ExecutionCreationView/hooks/useExecutionCreationFormState';",
        );
        expect(mainFileSource).toContain(
            "import { useExecutionCreationClaimCascade } from './ExecutionCreationView/hooks/useExecutionCreationClaimCascade';",
        );
        expect(mainFileSource).toContain(
            "import { useExecutionCreationPartyActions } from './ExecutionCreationView/hooks/useExecutionCreationPartyActions';",
        );
        expect(mainFileSource).toContain('= useExecutionCreationFormState(');
        expect(mainFileSource).toContain('= useExecutionCreationClaimCascade({');
        expect(mainFileSource).toContain('= useExecutionCreationPartyActions({');
    });

    it('the useState cluster is no longer declared inline in the main file', () => {
        const directStateDeclarations = mainFileSource.match(/const \[\w+, set\w+\] = useState/g) ?? [];
        expect(directStateDeclarations.length).toBe(0);
    });
});

describe('ExecutionCreationView Phase-2 split — size budget', () => {
    it('main ExecutionCreationView.tsx stays within the Phase-2 size budget after extraction', () => {
        expect(MAIN_FILE_LINE_COUNT).toBeLessThanOrEqual(1000);
    });

    it('FinancialOperationsCenter and PersonalCoerciveFollowupPanel were not touched by this split', () => {
        expect(mainFileSource).not.toContain('FinancialOperationsCenter');
        expect(mainFileSource).not.toContain('PersonalCoerciveFollowupPanel');
    });
});
