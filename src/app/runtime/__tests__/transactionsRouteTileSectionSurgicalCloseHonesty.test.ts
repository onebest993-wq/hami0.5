import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readCommandHubImplSource } from './readCommandHubImplSource';
import { readHomeTabImplSource } from './readHomeTabImplSource';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('transactions RouteTile section surgical close honesty', () => {
    it('TransactionCard لا يرسل أحداث تصحيح إلى 127.0.0.1:7777', () => {
        const card = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/TransactionsThreading/TransactionCard.tsx'),
            'utf8',
        );
        expect(card).not.toContain('127.0.0.1:7777');
        expect(card).not.toContain('debug-point');
    });

    it('MainView + Entry sync — Host يرسم System ثابتاً بلا InstantShell', () => {
        const main = readLawyerDashboardMainViewSurface();
        expect(main).toContain('LazyTransactionsOverlayEntry');
        expect(main).toMatch(/transactionsLive[\s\S]*?LazyTransactionsOverlayEntry/);
        expect(main).toContain('warmOverlayEntryChunks');
        expect(main).not.toContain('transactionsHostMounted');
        expect(main).not.toMatch(/جاري فتح المعاملات/);
        const entry = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardTransactionsOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('TransactionsThreadingHost');
        expect(entry).toContain('TransactionsErrorBoundary');
        expect(entry).toContain('open={showTransactions}');
        expect(entry).not.toContain('keepAlive');
        expect(entry).not.toContain('transactionsHostMounted');
        expect(entry).not.toContain('lazyWithRetry');
        expect(entry).not.toContain('Suspense');
        expect(entry).not.toContain('TransactionsHubInstantShell');
    });

    it('Host لا يرسم System وهي مغلقة + بلاطة المعاملات تفتح على pointerdown + تسخين قرص بلا Host عند الهوية', () => {
        const host = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/TransactionsThreading/TransactionsThreadingHost.tsx',
            ),
            'utf8',
        );
        expect(host).toContain('if (!open)');
        expect(host).not.toContain('keepAlive');
        expect(host).not.toMatch(/if \(!open && !keepAlive\)/);
        expect(host).toMatch(/import \{ TransactionsThreadingSystem \} from/);
        expect(host).not.toContain('Suspense');
        expect(host).not.toContain('lazy(');
        expect(host).not.toContain('InstantShell');
        const tiles = readCommandHubImplSource(root);
        expect(tiles).toContain("archiveId === 'transaction'");
        expect(tiles).toContain('dispatchTransactionsPrimeHost');
        expect(tiles).toContain('useScrollSafePress');
        expect(tiles).not.toContain('activateOnPointerDown');
        const warm = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/transactionsIntentWarm.ts'),
            'utf8',
        );
        expect(warm).toContain('prefetchTransactionsHubModule');
        expect(warm).toContain('warmTransactionsThreadingStore');
        expect(warm).not.toContain('dispatchTransactionsPrimeHost');
        expect(warm).not.toContain('LawyerDashboardTransactionsOverlayEntry');
        expect(warm).not.toContain('TransactionsThreadingHost');
        expect(warm).toMatch(/warmTransactionsDataNow/);
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardTransactions.ts'),
            'utf8',
        );
        expect(hook).toContain('تسخين القرص فور وجود هوية');
        expect(hook).not.toContain('ركّب Host مخفياً فور وجود هوية');
        expect(hook).not.toContain('shouldKeepTransactionsHostWarm');
        expect(hook).not.toContain('useKeepAliveIdleRelease');
        expect(hook).not.toContain('transactionsHostMounted');
        expect(hook).not.toContain('armTransactionsHost');
        expect(hook).toContain('لمسة البلاطة: قرص + مقطع');
        const primeStart = hook.indexOf('const primeTransactionsHubMount');
        const primeEnd = hook.indexOf('تسخين القرص فور وجود هوية', primeStart);
        expect(primeStart).toBeGreaterThan(-1);
        expect(primeEnd).toBeGreaterThan(primeStart);
        expect(hook.slice(primeStart, primeEnd)).not.toContain('armTransactionsHost');
        expect(hook).toContain('useLayoutEffect');
        expect(hook).toContain('executeTransactionsOverlayClose');
        expect(hook).toContain('beginTransactionsShellExit');
        expect(hook).toContain('paintTransactionsInstantChrome');
        expect(hook).toContain('snapTransactionsShellOpen');
        expect(hook).toContain('snapTransactionsShellClose');
        expect(hook).toContain('isTransactionsShellSnappedOpen');
        expect(hook).toContain('blurFocusWithin');
        expect(hook).toContain('registerDashboardOverlayCloser(\'transactions\', closeTransactionsHub)');
        expect(hook).not.toContain('hydrateTransactionsBootShellForInstantOpen');
        const paint = fs.readFileSync(
            path.join(root, 'src/app/runtime/transactionsInstantPaint.ts'),
            'utf8',
        );
        expect(paint).toContain('armOverlayEnterSettle');
        expect(paint).toContain('data-hami-tx-enter');
        expect(paint).toContain('queryLiveTransactionsHub');
        const exit = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/transactions/transactionsShellExit.ts'),
            'utf8',
        );
        expect(exit).toContain('data-hami-transactions-closing');
        expect(exit).toContain("removeAttribute(OPEN_ATTR)");
        const css = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
            'utf8',
        );
        const motion = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/lawyerHomeFx-overlayMotion.css'),
            'utf8',
        );
        expect(css).toContain("data-hami-transactions-closing='1'");
        expect(css).not.toContain("data-hami-tx-enter='1'");
        expect(motion).toContain("data-hami-tx-enter='1'");
        expect(motion).toContain('translate3d(0, 8px, 0)');
        expect(motion).toContain('translate3d(0, 10px, 0)');
    });

    it('hubHomeOpen لا يستدعي prime المكرر بعد فتح المعاملات', () => {
        const open = fs.readFileSync(
            path.join(root, 'src/app/services/hub/hubHomeOpen.ts'),
            'utf8',
        );
        expect(open).toContain("transaction: 'transaction'");
        expect(open).toContain('openHubArchiveFromHomeTile');
        expect(open).toContain('hasLocalAppSession(userId)');
        expect(open).not.toContain('hasLocalAppSession(null)');
        expect(open).not.toContain('primeTransactionsShellForOpen');
        expect(open).not.toContain('primeTransactionsHubMount');
    });

    it('بعد interactive: تسخين فقط بلا armTransactionsHost', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardTransactions.ts'),
            'utf8',
        );
        expect(hook).toContain('prefetchTransactionsAfterBootReveal');
        const warmBlock = hook.match(
            /const scheduleWarm = \(\) => \{[\s\S]*?\n        \};/,
        )?.[0];
        expect(warmBlock).toBeTruthy();
        expect(warmBlock).toContain('prefetchTransactionsAfterBootReveal');
        expect(warmBlock).not.toContain('armTransactionsHost');
    });

    it('navigateWorkspaceRoute hub/transaction يفتح مركز المعاملات', () => {
        const nav = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(nav).toMatch(
            /section === 'transaction'[\s\S]*?openTransactionsHub\(\)/,
        );
    });

    it('RouteTile و HomeTab لا يسحبان lucide لبلاطات hub', () => {
        const tiles = readCommandHubImplSource(root);
        expect(tiles).not.toContain("from '@/app/components/ui/lucideIcons'");
        expect(tiles).not.toContain("from 'lucide-react'");
        expect(tiles).toContain('HubTileFace');
        expect(tiles).not.toContain('HomeArrowLeftIcon');
        expect(tiles).not.toContain('HomeFileTextIcon');
        expect(tiles).not.toContain('HomeScaleIcon');
        expect(tiles).not.toContain('resolveHubRouteTileIcon');
        const home = readHomeTabImplSource(root);
        expect(home).not.toContain('HomeFileTextIcon');
        expect(home).not.toContain('HomeScaleIcon');
        expect(home).not.toContain("icon: HomeFileTextIcon");
        expect(home).not.toMatch(/icon:\s*FileText/);
        expect(home).not.toMatch(/icon:\s*Scale[,}]/);
        expect(home).not.toMatch(/from ['"]@\/app\/components\/lawyer\/dashboard\/homeStemIcons['"]/);
    });

    it('مسار البلاطة ما زال عبر hub-archive-transaction', () => {
        const tiles = readCommandHubImplSource(root);
        expect(tiles).toContain('hub-archive-${card.id}');
        expect(tiles).toContain('buildHubTileAriaLabel');
        const home = readHomeTabImplSource(root);
        expect(home).toContain("tileId: 'hubTransaction'");
        expect(home).toContain('HOME_HUB_TILE_LABELS.hubTransaction');
        expect(home).toContain("id: 'transaction'");
    });

    it('تسخين المقطع بعد content-ready يشمل Entry المعاملات', () => {
        const chunks = fs.readFileSync(
            path.join(root, 'src/app/runtime/overlayEntryChunks.ts'),
            'utf8',
        );
        expect(chunks).toContain('prefetchTransactionsHubModule');
        const system = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem.tsx'),
            'utf8',
        );
        expect(system).toContain('inertProps(!open)');
        expect(system).toContain('createPortal');
        expect(system).toContain('removeTransactionsInstantChrome');
        expect(system).not.toContain('TransactionsHubInstantShell');
    });

    it('قائمة المعاملات لا تسحب مهام threading ميتة ولا تصدّر System افتراضياً', () => {
        const listHook = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/TransactionsThreading/hooks/useTransactionsListScreen.ts'),
            'utf8',
        );
        expect(listHook).not.toContain('threadingTasks');
        expect(listHook).not.toContain('tasksByTransactionId');
        const card = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/TransactionsThreading/TransactionCard.tsx'),
            'utf8',
        );
        expect(card).toContain('txStatusLabelAr');
        expect(card).toContain('txStatusBadgeClass');
        expect(card).not.toContain('function statusLabelAr');
        expect(card).not.toContain('function statusBadgeClass');
        const system = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem.tsx'),
            'utf8',
        );
        expect(system).not.toContain('export default');
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/TransactionsThreading/TransactionsThreadingHost.tsx'),
            'utf8',
        );
        expect(host).not.toContain('export type { TransactionsThreadingSystemProps }');
        const details = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/TransactionsThreading/transactionDetails/useTransactionDetailsController.ts',
            ),
            'utf8',
        );
        expect(details).toContain('completeOpen');
        expect(details).toContain('copyTransactionsText');
        const copyHelper = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/TransactionsThreading/copyTransactionsText.ts'),
            'utf8',
        );
        expect(copyHelper).toContain('withAllowedClipboardAction');
        const taskHook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/TransactionsThreading/taskThread/useTaskThreadController.ts',
            ),
            'utf8',
        );
        expect(taskHook).toContain('taskCompleteOpen');
        expect(taskHook).not.toContain('refreshTransactionData');
    });
});
