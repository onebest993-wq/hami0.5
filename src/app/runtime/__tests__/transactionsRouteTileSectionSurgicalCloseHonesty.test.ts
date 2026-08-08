import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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

    it('MainView + Entry sync مثل الإعدادات — بلا Suspense InstantShell على المسار السعيد', () => {
        const main = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('LawyerDashboardTransactionsOverlayEntry');
        expect(main).toMatch(
            /transactionsLive[\s\S]*?LawyerDashboardTransactionsOverlayEntry/,
        );
        expect(main).not.toContain('LazyTransactionsOverlayEntry');
        expect(main).not.toMatch(/جاري فتح المعاملات/);
        const entry = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardTransactionsOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('TransactionsThreadingHost');
        expect(entry).toContain('keepAlive={transactionsHostMounted}');
        expect(entry).not.toContain('lazyWithRetry');
        expect(entry).not.toContain('Suspense');
        const fallback = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerDashboardParts/LazyFallback.tsx'),
            'utf8',
        );
        expect(fallback).not.toMatch(/جاري فتح المعاملات/);
        expect(fallback).toContain('TransactionsHubInstantShell');
    });

    it('Host يحترم keepAlive + بلاطة المعاملات تفتح على pointerdown + Host يُركَّب فور الهوية', () => {
        const host = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/TransactionsThreading/TransactionsThreadingHost.tsx',
            ),
            'utf8',
        );
        expect(host).toContain('keepAlive');
        expect(host).toMatch(/open \|\| keepAlive/);
        expect(host).toMatch(/أبقِ System في DOM مخفياً/);
        const tiles = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/commandHub/CommandHubTiles.tsx',
            ),
            'utf8',
        );
        expect(tiles).toContain("card.id === 'transaction'");
        expect(tiles).toContain('dispatchTransactionsPrimeHost');
        expect(tiles).toContain('activateOnPointerDown');
        const warm = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/transactionsIntentWarm.ts'),
            'utf8',
        );
        expect(warm).toContain('LawyerDashboardTransactionsOverlayEntry');
        expect(warm).toContain('TransactionsThreadingHost');
        expect(warm).toContain('warmTransactionsThreadingStore');
        expect(warm).not.toContain('dispatchTransactionsPrimeHost');
        expect(warm).toMatch(/warmTransactionsDataNow/);
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardTransactions.ts'),
            'utf8',
        );
        expect(hook).toContain('ركّب Host مخفياً فور وجود هوية');
        expect(hook).toContain('useLayoutEffect');
        const instant = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/TransactionsThreading/TransactionsHubInstantShell.tsx',
            ),
            'utf8',
        );
        expect(instant).not.toContain('animate-pulse');
        expect(instant).not.toContain('aria-busy');
    });

    it('hubHomeOpen لا يستدعي prime المكرر بعد فتح المعاملات', () => {
        const open = fs.readFileSync(
            path.join(root, 'src/app/services/hub/hubHomeOpen.ts'),
            'utf8',
        );
        expect(open).toContain("archiveId === 'transaction'");
        expect(open).toContain('isRealSignedIn(userId)');
        expect(open).not.toContain('isRealSignedIn(null)');
        expect(open).not.toContain('primeTransactionsShellForOpen');
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
        const tiles = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/commandHub/CommandHubTiles.tsx',
            ),
            'utf8',
        );
        expect(tiles).not.toContain("from '@/app/components/ui/lucideIcons'");
        expect(tiles).toContain('HomeArrowLeftIcon');
        const home = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(home).toContain('HomeFileTextIcon');
        expect(home).toContain('HomeScaleIcon');
        expect(home).toContain("icon: HomeFileTextIcon");
        expect(home).not.toMatch(/icon:\s*FileText/);
        expect(home).not.toMatch(/icon:\s*Scale[,}]/);
    });

    it('مسار البلاطة ما زال عبر hub-archive-transaction', () => {
        const tiles = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/commandHub/CommandHubTiles.tsx',
            ),
            'utf8',
        );
        expect(tiles).toContain('hub-archive-${card.id}');
        expect(tiles).toContain('aria-label={`${card.label} — فتح الأرشيف`}');
        const home = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(home).toContain("tileId: 'hubTransaction'");
        expect(home).toContain("label: 'معاملات'");
        expect(home).toContain("id: 'transaction'");
    });
});
