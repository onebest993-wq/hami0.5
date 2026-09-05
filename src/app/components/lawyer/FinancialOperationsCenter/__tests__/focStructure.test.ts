import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MAIN_FILE = path.resolve(__dirname, '../../FinancialOperationsCenter.tsx');
const COMPONENTS_DIR = path.resolve(__dirname, '../components');
const SETTLEMENT_ACTIONS_HOOK_FILE = path.resolve(__dirname, '../useFocSettlementActions.ts');
const PAYMENT_DISBURSE_ACTIONS_HOOK_FILE = path.resolve(__dirname, '../useFocPaymentDisburseActions.ts');
const FOC_PROPS_FILE = path.resolve(__dirname, '../focProps.ts');
const LEDGER_DERIVED_HOOK_FILE = path.resolve(__dirname, '../useFocLedgerDerived.ts');
const LEDGER_STORE_HOOK_FILE = path.resolve(__dirname, '../useFocLedgerStore.ts');
const COLLECTION_ACTIONS_HOOK_FILE = path.resolve(__dirname, '../useFocCollectionActions.ts');

const mainFileSource = fs.readFileSync(MAIN_FILE, 'utf8');
const MAIN_FILE_LINE_COUNT = mainFileSource.split('\n').length;

/**
 * كل نص مميّز يخص أحد المودالات/الشيتات المستخرجة — يجب أن يبقى داخل مكوّنه الجديد فقط
 * ولا يتكرر كتعليق أو نص منطقي آخر في الملف الرئيسي.
 */
const EXTRACTED_MODAL_MARKERS: Array<{ file: string; marker: string }> = [
    { file: 'FocDisburseModal.tsx', marker: 'طلب صرف الأمانات التنفيذية' },
    { file: 'FocGhuramaaModal.tsx', marker: 'اعتماد وتوزيع القسمة' },
    { file: 'FocFeesSheet.tsx', marker: 'طلب صرف أتعاب (تخلية)' },
    { file: 'FocExpenseSheet.tsx', marker: 'تسجيل مصروف' },
    { file: 'FocGarnishModal.tsx', marker: 'تأكيد حجز الراتب' },
    { file: 'FocFundsCardHeader.tsx', marker: 'مسار التخلية — التفاصيل أدناه' },
    { file: 'FocEvictionLedgerBody.tsx', marker: 'تفعيل مطالبة الأتعاب المحكوم بها' },
    {
        file: 'FocCreditorExpandedBody.tsx',
        marker: 'رسم التحصيل (٣٪) — انتهاء مدة الإخبار بالتنفيذ دون سداد أو حضور',
    },
];

describe('FinancialOperationsCenter modal/sheet extraction', () => {
    it.each(EXTRACTED_MODAL_MARKERS)(
        '$file exists and owns its distinctive marker',
        ({ file, marker }) => {
            const filePath = path.join(COMPONENTS_DIR, file);
            expect(fs.existsSync(filePath)).toBe(true);
            const source = fs.readFileSync(filePath, 'utf8');
            expect(source).toContain(marker);
        }
    );

    it('main FinancialOperationsCenter.tsx no longer contains the extracted modals distinctive strings', () => {
        for (const { marker } of EXTRACTED_MODAL_MARKERS) {
            expect(mainFileSource).not.toContain(marker);
        }
    });

    it('main FinancialOperationsCenter.tsx loads extracted overlays via focOverlaySurfacesLazy', () => {
        expect(mainFileSource).toContain(
            "from './FinancialOperationsCenter/focOverlaySurfacesLazy';",
        );
        expect(mainFileSource).toContain('FocLazyOverlay');
        expect(mainFileSource).toContain('LazyFocDisburseModal');
        expect(mainFileSource).toContain('LazyFocGhuramaaModal');
        expect(mainFileSource).toContain('LazyFocFeesSheet');
        expect(mainFileSource).toContain('LazyFocExpenseSheet');
        expect(mainFileSource).toContain('LazyFocGarnishModal');
        expect(mainFileSource).toContain('LazyFocAlimonyDetailOverlay');
        expect(mainFileSource).toContain(
            "import { FocFundsCardHeader } from './FinancialOperationsCenter/components/FocFundsCardHeader';",
        );
        expect(mainFileSource).toContain(
            "import { FocCreditorExpandedBody } from './FinancialOperationsCenter/components/FocCreditorExpandedBody';",
        );
        expect(mainFileSource).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/FocDisburseModal['"]/,
        );
        expect(mainFileSource).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/FocGhuramaaModal['"]/,
        );
        expect(mainFileSource).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/FocFeesSheet['"]/,
        );
        expect(mainFileSource).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/FocExpenseSheet['"]/,
        );
        expect(mainFileSource).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/FocGarnishModal['"]/,
        );
    });

    it('DebtTotalsEditModal stays a separate module and loads lazily', () => {
        expect(fs.existsSync(path.join(COMPONENTS_DIR, 'DebtTotalsEditModal.tsx'))).toBe(true);
        expect(mainFileSource).toContain('LazyDebtTotalsEditModal');
        expect(mainFileSource).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/DebtTotalsEditModal['"]/,
        );
        expect(mainFileSource).not.toContain('LazyGuarantorRegistrationModal');
        expect(mainFileSource).not.toMatch(
            /from\s+['"]\.\/Modal_Guarantor_Registration['"]/,
        );
        expect(mainFileSource).not.toContain('alimonyPaymentEngine');
    });
});

describe('FinancialOperationsCenter settlement actions extraction', () => {
    it('useFocSettlementActions.ts exists and exports the settlement lifecycle hook', () => {
        expect(fs.existsSync(SETTLEMENT_ACTIONS_HOOK_FILE)).toBe(true);
        const source = fs.readFileSync(SETTLEMENT_ACTIONS_HOOK_FILE, 'utf8');
        expect(source).toContain('export function useFocSettlementActions');
        expect(source).toContain('registerSettlementPlan');
        expect(source).toContain('markPendingSettlementPaid');
        expect(source).toContain('cancelPendingSettlement');
        expect(source).toContain('activateSettlementPanel');
        expect(source).toContain('deactivateSettlementPanel');
    });

    it('main FinancialOperationsCenter.tsx imports and uses useFocSettlementActions', () => {
        expect(mainFileSource).toContain(
            "import { useFocSettlementActions } from './FinancialOperationsCenter/useFocSettlementActions';"
        );
        expect(mainFileSource).toContain('} = useFocSettlementActions({');
    });

    it('registerSettlementPlan is no longer defined as a local const in the main file', () => {
        expect(mainFileSource).not.toMatch(/const registerSettlementPlan\s*=/);
    });
});

describe('FinancialOperationsCenter payment/disburse actions extraction', () => {
    const paymentDisburseHookSource = fs.readFileSync(PAYMENT_DISBURSE_ACTIONS_HOOK_FILE, 'utf8');

    it('useFocPaymentDisburseActions.ts exists and exports the hook with its handlers', () => {
        expect(fs.existsSync(PAYMENT_DISBURSE_ACTIONS_HOOK_FILE)).toBe(true);
        expect(paymentDisburseHookSource).toContain('export function useFocPaymentDisburseActions');
        for (const symbol of [
            'addLawyerFee',
            'addExpense',
            'applyDisbursementAmount',
            'undoLastPayment',
            'applyFullPayment',
            'applyDebtRepayment',
            'confirmGarnishment',
            'closeGarnishModal',
            'retractCollectionRequest',
        ]) {
            expect(paymentDisburseHookSource).toContain(symbol);
        }
        expect(paymentDisburseHookSource).not.toContain('applyGhuramaaDistribution');
        expect(paymentDisburseHookSource).not.toContain('buildGhuramaaContext');
        expect(paymentDisburseHookSource).not.toContain('executionFormUtils');
        expect(paymentDisburseHookSource).not.toMatch(
            /from\s+['"]@\/app\/components\/ui\/SmartDialog['"]/,
        );
    });

    it('main FinancialOperationsCenter.tsx imports and uses useFocPaymentDisburseActions', () => {
        expect(mainFileSource).toContain(
            "import { useFocPaymentDisburseActions } from './FinancialOperationsCenter/useFocPaymentDisburseActions';"
        );
        expect(mainFileSource).toContain('} = useFocPaymentDisburseActions({');
    });

    it.each([
        'addLawyerFee',
        'addExpense',
        'applyDisbursementAmount',
        'applyGhuramaaDistribution',
        'applyGhuramaaEqualSplit',
        'openGhuramaaModal',
        'setGhuramaaShareInput',
        'undoLastPayment',
        'applyFullPayment',
        'applyDebtRepayment',
        'confirmGarnishment',
        'closeGarnishModal',
        'retractCollectionRequest',
    ])('%s is no longer defined as a local const/function in the main file', (symbolName) => {
        const localConstOrFunctionPattern = new RegExp(
            `const ${symbolName}\\s*=|function ${symbolName}\\s*\\(`
        );
        expect(mainFileSource).not.toMatch(localConstOrFunctionPattern);
    });

    it('ghuramaaShareInputs/ghuramaaSplitMode local useState is removed from the main file (owned by the hook)', () => {
        expect(mainFileSource).not.toMatch(/const \[ghuramaaShareInputs, setGhuramaaShareInputs\] = useState/);
        expect(mainFileSource).not.toMatch(/const \[ghuramaaSplitMode, setGhuramaaSplitMode\] = useState/);
    });

    it('main file destructures the payment/disburse action results it renders', () => {
        for (const returnedSymbol of [
            'canAddLawyerFee',
            'canAddExpense',
            'canApplyDisburseAmount',
            'canConfirmGarnishment',
            'canApplyRepayment',
            'repaymentExceedsRemaining',
        ]) {
            expect(mainFileSource).toContain(returnedSymbol);
        }
    });

    it('main FinancialOperationsCenter.tsx stays within the Phase-1 size budget after extraction', () => {
        expect(MAIN_FILE_LINE_COUNT).toBeLessThanOrEqual(1600);
    });
});

describe('FinancialOperationsCenter ghuramaa actions extraction', () => {
    const ghuramaaHookFile = path.resolve(__dirname, '../useFocGhuramaaActions.ts');
    const ghuramaaHookSource = fs.readFileSync(ghuramaaHookFile, 'utf8');

    it('useFocGhuramaaActions owns ghuramaa handlers and defers equal-split leaf', () => {
        expect(fs.existsSync(ghuramaaHookFile)).toBe(true);
        expect(ghuramaaHookSource).toContain('export function useFocGhuramaaActions');
        for (const symbol of [
            'applyGhuramaaDistribution',
            'applyGhuramaaEqualSplit',
            'openGhuramaaModal',
            'setGhuramaaShareInput',
            'buildGhuramaaContext',
        ]) {
            expect(ghuramaaHookSource).toContain(symbol);
        }
        expect(ghuramaaHookSource).toContain("import('./focGhuramaaEqualSplit')");
        expect(ghuramaaHookSource).not.toContain('executionFormDebtorShares');
        expect(ghuramaaHookSource).not.toContain('executionFormUtils');
    });

    it('main FinancialOperationsCenter.tsx imports and uses useFocGhuramaaActions', () => {
        expect(mainFileSource).toContain(
            "import { useFocGhuramaaActions } from './FinancialOperationsCenter/useFocGhuramaaActions';",
        );
        expect(mainFileSource).toContain('} = useFocGhuramaaActions({');
        for (const returnedSymbol of ['ghuramaaContext', 'ghuramaaManual', 'ghuramaaShareInputs']) {
            expect(mainFileSource).toContain(returnedSymbol);
        }
    });
});

describe('FinancialOperationsCenter ledger store extraction', () => {
    const ledgerStoreHookSource = fs.readFileSync(LEDGER_STORE_HOOK_FILE, 'utf8');

    it('useFocLedgerStore.ts exists and exports the store hook + external collect sync', () => {
        expect(fs.existsSync(LEDGER_STORE_HOOK_FILE)).toBe(true);
        expect(ledgerStoreHookSource).toContain('export function useFocLedgerStore');
        expect(ledgerStoreHookSource).toContain('export function useFocLedgerExternalCollectSync');
        for (const symbol of [
            'persist',
            'getLatestLedgerStore',
            'ledgerTotalParams',
            'isEvictionCollectionRequested',
            'unifiedCollectionExecutorApproved',
            'unifiedCollectionDecisionState',
        ]) {
            expect(ledgerStoreHookSource).toContain(symbol);
        }
    });

    it('main FinancialOperationsCenter.tsx imports and destructures useFocLedgerStore', () => {
        expect(mainFileSource).toContain(
            "import { useFocLedgerStore, useFocLedgerExternalCollectSync } from './FinancialOperationsCenter/useFocLedgerStore';"
        );
        expect(mainFileSource).toContain('} = useFocLedgerStore({');
        expect(mainFileSource).toContain('useFocLedgerExternalCollectSync({');
    });

    it.each(['persist', 'getLatestLedgerStore', 'ledgerTotalParams', 'isEvictionCollectionRequested'])(
        '%s is no longer computed via a local useState/useCallback/useMemo in the main file',
        (symbolName) => {
            const localDeclarationPattern = new RegExp(
                `const (\\[)?${symbolName}\\]? = use(State|Callback|Memo)`
            );
            expect(mainFileSource).not.toMatch(localDeclarationPattern);
        }
    );

    it('the unified ledger hydrate effect is no longer inlined in the main file', () => {
        expect(mainFileSource).not.toContain('hydrateUnifiedLedgerFromRawStorage');
        expect(mainFileSource).not.toContain('seedUnifiedLedgerStoreForExecution');
        expect(mainFileSource).not.toMatch(/const \[store, setStore\] = useState/);
    });
});

describe('FinancialOperationsCenter collection actions extraction', () => {
    const collectionActionsHookSource = fs.readFileSync(COLLECTION_ACTIONS_HOOK_FILE, 'utf8');

    it('useFocCollectionActions.ts exists and exports the collection-request hook', () => {
        expect(fs.existsSync(COLLECTION_ACTIONS_HOOK_FILE)).toBe(true);
        expect(collectionActionsHookSource).toContain('export function useFocCollectionActions');
        for (const symbol of ['openDebtEditModal', 'applyDebtTotalsEdit', 'submitCollectionRequest']) {
            expect(collectionActionsHookSource).toContain(symbol);
        }
    });

    it('main FinancialOperationsCenter.tsx imports and uses useFocCollectionActions', () => {
        expect(mainFileSource).toContain(
            "import { useFocCollectionActions } from './FinancialOperationsCenter/useFocCollectionActions';"
        );
        expect(mainFileSource).toContain(
            '} = useFocCollectionActions({'
        );
    });

    it.each(['openDebtEditModal', 'applyDebtTotalsEdit', 'submitCollectionRequest'])(
        '%s is no longer defined as a local const/function in the main file',
        (symbolName) => {
            const localConstOrFunctionPattern = new RegExp(
                `const ${symbolName}\\s*=|function ${symbolName}\\s*\\(`
            );
            expect(mainFileSource).not.toMatch(localConstOrFunctionPattern);
        }
    );

    it('dead eviction-ledger-ui/partial-settlement helpers were removed rather than relocated', () => {
        expect(mainFileSource).not.toContain('_activateEvictionLedger');
        expect(mainFileSource).not.toContain('_applyPartialSettlement');
        expect(mainFileSource).not.toMatch(/const \[showEvictionLedgerUi, setShowEvictionLedgerUi\] = useState/);
    });
});

describe('FinancialOperationsCenter overall size budget', () => {
    it('main FinancialOperationsCenter.tsx is at most 1000 lines after the ledger-store/collection-actions extraction', () => {
        expect(MAIN_FILE_LINE_COUNT).toBeLessThanOrEqual(1000);
    });
});

describe('FOC empty-seed guard (phase-2)', () => {
    it('useFocLedgerStore exports readInitialFocLedgerStore and uses it in useState initializer', () => {
        expect(fs.existsSync(LEDGER_STORE_HOOK_FILE)).toBe(true);
        const source = fs.readFileSync(LEDGER_STORE_HOOK_FILE, 'utf8');
        expect(source).toContain('export function readInitialFocLedgerStore');
        expect(source).toContain('readInitialFocLedgerStore(executionId');
        expect(source).not.toMatch(/useState<UnifiedLedgerStore>\(\(\) => emptyStore\(\)\)/);
    });
});

describe('FinancialOperationsCenter props extraction', () => {
    it('focProps.ts exists and exports FinancialOperationsCenterProps', () => {
        expect(fs.existsSync(FOC_PROPS_FILE)).toBe(true);
        const source = fs.readFileSync(FOC_PROPS_FILE, 'utf8');
        expect(source).toContain('export interface FinancialOperationsCenterProps');
    });

    it('main FinancialOperationsCenter.tsx re-exports the props type instead of declaring it locally', () => {
        expect(mainFileSource).toContain(
            "export type { FinancialOperationsCenterProps } from './FinancialOperationsCenter/focProps';"
        );
        expect(mainFileSource).not.toMatch(/export interface FinancialOperationsCenterProps/);
    });
});

describe('FinancialOperationsCenter derived-values (ledger) extraction', () => {
    const ledgerDerivedHookSource = fs.readFileSync(LEDGER_DERIVED_HOOK_FILE, 'utf8');

    it('useFocLedgerDerived.ts exists and exports the derived-values hook', () => {
        expect(fs.existsSync(LEDGER_DERIVED_HOOK_FILE)).toBe(true);
        expect(ledgerDerivedHookSource).toContain('export function useFocLedgerDerived');
        for (const symbol of [
            'totalOwedUnified',
            'remainingUnified',
            'trustBalanceUnified',
            'settlementUxTier',
            'settlementContext',
            'canSubmitEvictionPhase2',
            'canShowDisburse',
            'ongoingAlimonyDisplay',
        ]) {
            expect(ledgerDerivedHookSource).toContain(symbol);
        }
    });

    it('main FinancialOperationsCenter.tsx imports and uses useFocLedgerDerived', () => {
        expect(mainFileSource).toContain(
            "import { useFocLedgerDerived } from './FinancialOperationsCenter/useFocLedgerDerived';"
        );
        expect(mainFileSource).toContain('} = useFocLedgerDerived({');
    });

    it.each([
        'totalOwedUnified',
        'remainingUnified',
        'settlementUxTier',
        'settlementContext',
        'salarySeizureActive',
        'showEmployeeCollectionStandard',
        'canSubmitEvictionPhase2',
        'hideEvictionTotalsInChrome',
    ])('%s is no longer computed via a local useMemo/const in the main file', (symbolName) => {
        // Only the destructuring assignment from useFocLedgerDerived should introduce this name.
        const localDeclarationPattern = new RegExp(`const ${symbolName}\\s*=`);
        const destructurePattern = new RegExp(`\\b${symbolName}\\b,?\\s*\\n`);
        expect(mainFileSource).toMatch(destructurePattern);
        expect(mainFileSource).not.toMatch(localDeclarationPattern);
    });
});

describe('FinancialOperationsCenter guarantor + eviction parent wiring', () => {
    it('يمرّر شارة الكفيل المرتبطة بالتسوية ولا يتجاهل onPersistSettlementGuarantor', () => {
        expect(mainFileSource).toContain('onPersistSettlementGuarantor={onPersistSettlementGuarantor}');
        expect(mainFileSource).not.toMatch(/onPersistSettlementGuarantor: _onPersistSettlementGuarantor/);
        const body = fs.readFileSync(
            path.join(COMPONENTS_DIR, 'FocCreditorExpandedBody.tsx'),
            'utf8',
        );
        expect(body).toContain('SettlementGuarantorBadge');
        expect(body).toContain('onPersistSettlementGuarantor');
    });

    it('يبلّغ الأب عند أول تفعيل لوعاء التخلية من الاستحصال', () => {
        expect(mainFileSource).toContain('onEvictionLedgerActivated,');
        expect(mainFileSource).toContain('evictionLedgerActivatedPersisted,');
        const collect = fs.readFileSync(COLLECTION_ACTIONS_HOOK_FILE, 'utf8');
        expect(collect).toContain('shouldNotifyParentEvictionLedgerActivated');
        expect(collect).toContain('onEvictionLedgerActivated?.()');
    });
});
