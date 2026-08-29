import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ARCHIVE_ROYAL_GLASS_FAB } from '@/app/components/lawyer/ArchivePortal/archiveToolbarStyles';
import { EXECUTION_ARCHIVE_CARD_CLASS, EXECUTION_ARCHIVE_FAB } from '../executionArchiveVisualLite';

const portal = resolve(__dirname, '..');

function read(rel: string) {
    return readFileSync(resolve(portal, rel), 'utf8');
}

describe('execution archive visual lite (explicit design permission)', () => {
    it('بطاقة المخزن مسطّحة بلا تدرج أو ظل أو رفع hover', () => {
        expect(EXECUTION_ARCHIVE_CARD_CLASS).toContain('bg-[#0B1021]');
        expect(EXECUTION_ARCHIVE_CARD_CLASS).toContain('rounded-xl');
        expect(EXECUTION_ARCHIVE_CARD_CLASS).not.toContain('linear-gradient');
        expect(EXECUTION_ARCHIVE_CARD_CLASS).not.toContain('shadow-[');
        expect(EXECUTION_ARCHIVE_CARD_CLASS).not.toContain('transition-colors');
        expect(EXECUTION_ARCHIVE_CARD_CLASS).not.toContain('hover:');
        const card = read('components/ExecutionSmartCard.tsx');
        expect(card).toContain('EXECUTION_ARCHIVE_CARD_CLASS');
        expect(card).not.toContain('whileHover');
        expect(card).not.toContain('linear-gradient');
        expect(card).not.toContain("from '@/app/motion/overlayMotionRuntime'");
        expect(card).not.toContain('ring-1 ring-rose');
        const body = read('components/ExecutionSmartCardBody.tsx');
        expect(body).not.toContain('bg-gradient-to-b');
        expect(body).not.toContain('min-h-[36px]');
        expect(body).toContain('text-[15px]');
        expect(body).toContain('ExecutionArchiveEyeMark');
        expect(body).toContain('ExecutionArchiveLinkMark');
        expect(body).toContain('العقار (من بيانات الإضبارة)');
        expect(body).not.toContain("from '@/app/components/ui/icons/");
        expect(body).not.toContain("from '@/app/utils/executionModuleStrategies'");
        expect(body).toContain("from '@/app/utils/isEvictionClaim'");
        expect(body).not.toContain('ExecutionDashboard');
        expect(body).toContain("from '../executionArchiveStatusLabel'");
        expect(body).toContain("from './ExecutionArchiveCardPin'");
        expect(body).not.toContain("import('@/app/workspace/WorkspacePinButton')");
        expect(body).not.toMatch(/from '@\/app\/workspace\/WorkspacePinButton'/);
        const pin = read('components/ExecutionArchiveCardPin.tsx');
        expect(pin).toContain("import('@/app/stores/workspaceStore')");
        expect(pin).not.toContain('WorkspacePinButton');
        expect(pin).not.toContain('requestIdleCallback');
        expect(pin).toContain('aria-pressed');
        expect(pin).toContain('togglePin');
        expect(pin).toContain('min-h-[44px]');
        const marks = read('executionArchiveMarks.tsx');
        expect(marks).not.toContain("from 'lucide-react'");
        expect(marks).toContain('M5 17h14v-1.76');
        expect(marks).toContain('M2 12s3-7 10-7');
        expect(read('components/executionSmartCardChrome.tsx')).toContain('min-h-[44px]');
        const preview = read('components/ArchivePortalExecutionPreviewModal.tsx');
        expect(preview).not.toContain('overlayMotionRuntime');
        expect(preview).not.toContain('bg-gradient-to-r');
        expect(preview).not.toContain("from '@/app/components/ui/icons/");
        expect(preview).toContain("from '@/app/utils/isEvictionClaim'");
        expect(preview).toContain("from '../executionArchiveCardView'");
        expect(preview).not.toContain("from '../utils'");
        expect(preview).toContain("import('../executionArchivePreviewTimeline')");
        expect(preview).toContain('registerNativeBackHandler');
        expect(preview).toContain('EXECUTION_ARCHIVE_PREVIEW_OVERLAY_CLASS');
        expect(preview).toContain('aria-modal');
        expect(preview).toContain('warmExecutionDossierFromArchiveCard');
        expect(preview).toContain('ignoreBackdropUntilRef');
        expect(pin).toContain('peekPinned');
        const previewLayer = read('executionArchivePreviewLayer.ts');
        expect(previewLayer).toContain('safe-area-inset-left');
        expect(previewLayer).toContain('safe-area-inset-bottom');
    });

    it('FAB التنفيذ محلي 44px ولا يغيّر زر أرشيف الدعاوى الملكي', () => {
        expect(EXECUTION_ARCHIVE_FAB).toContain('min-h-[44px]');
        expect(EXECUTION_ARCHIVE_FAB).toContain('touch-manipulation');
        expect(EXECUTION_ARCHIVE_FAB).not.toContain('min-h-[3.5rem]');
        expect(EXECUTION_ARCHIVE_FAB).not.toContain('hover:');
        expect(ARCHIVE_ROYAL_GLASS_FAB).toContain('min-h-[3.5rem]');
        const chrome = read('ExecutionArchiveChrome.tsx');
        expect(chrome).toContain('EXECUTION_ARCHIVE_FAB');
        expect(chrome).not.toContain('ARCHIVE_ROYAL_GLASS_FAB');
        expect(chrome).not.toContain('py-5');
        expect(chrome).not.toContain('backdrop-blur-sm');
        expect(chrome).not.toContain("from '@/app/components/ui/icons/");
        expect(chrome).toContain('ExecutionArchivePreviewPaintSlot');
        expect(chrome).not.toContain('<Suspense fallback={null}>');
        expect(chrome).toContain('hasExecutionArchivePreviewLayer');
        const grid = read('components/ExecutionArchiveFileGrid.tsx');
        expect(grid).not.toContain('جاري تحميل الإضابير');
        expect(grid).toContain('ExecutionArchiveCardPaintSlot');
        expect(grid).toContain('estimateRowSize={176}');
        const toolbar = read('components/ExecutionArchiveToolbar.tsx');
        expect(toolbar).not.toContain('hami-royal-glass');
        expect(toolbar).toContain('EXECUTION_FILTER_TAB_ACTIVE');
        expect(toolbar).not.toContain("from '@/app/components/ui/icons/");
        expect(toolbar).not.toContain('focus-within:ring-1');
        expect(toolbar).toContain('focus-within:border-[#E6C673]/45');
        expect(read('components/ExecutionArchiveLifecycleBars.tsx')).not.toContain(
            "from '@/app/components/ui/icons/",
        );
        expect(read('components/ExecutionArchiveTrashDialogs.tsx')).not.toContain(
            "from '@/app/components/ui/icons/",
        );
    });

    it('قشرة المخزن الفورية بلا pb-4 وعنوان مضغوط موحّد مع التوأم', () => {
        const instant = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/dashboard/ExecutionArchiveInstantChrome.tsx'),
            'utf8',
        );
        expect(instant).toContain('EXECUTION_ARCHIVE_INSTANT_HEADER');
        expect(instant).toContain('EXECUTION_ARCHIVE_INSTANT_HEADER_ROW');
        expect(instant).toContain('EXECUTION_ARCHIVE_INSTANT_TITLE');
        expect(instant).not.toContain('pb-4');
        expect(instant).not.toContain('text-lg sm:text-xl');
        expect(instant).not.toContain('border-white/10 bg-[#0B1021]');
        const visualLite = read('executionArchiveVisualLite.ts');
        expect(visualLite).toContain('pb-1');
        expect(visualLite).toContain('text-[13px]');
        expect(visualLite).toContain('EXECUTION_SEGMENT_BTN_INACTIVE');
        expect(visualLite).toContain('bg-transparent border border-transparent');
        expect(visualLite).not.toContain('bg-[#080C16]/90');
        expect(visualLite).toContain("EXECUTION_SEGMENT_SHELL =\n    'flex items-center gap-1 overflow-x-auto scrollbar-hide'");
        const lifecycle = read('components/ExecutionArchiveLifecycleBars.tsx');
        expect(lifecycle).not.toContain('ExecutionArchiveBoxMark');
        expect(lifecycle).toContain('EXECUTION_SEGMENT_BTN_INACTIVE');
        expect(lifecycle).toContain('EXECUTION_SEGMENT_ARCHIVED_ACTIVE');
        const toolbar = read('components/ExecutionArchiveToolbar.tsx');
        expect(toolbar).toContain('EXECUTION_SEGMENT_BTN_INACTIVE');
        expect(toolbar).not.toContain('ARCHIVE_SEGMENT_BTN_INACTIVE');
        expect(toolbar).toContain('EXECUTION_CHIP_INACTIVE');
        const grid = read('components/ExecutionArchiveFileGrid.tsx');
        expect(grid).toContain('resolveExecutionArchiveEmptyCopy');
        expect(grid).not.toContain('min-h-full');
        expect(grid).toContain('py-10');
        const instantFrame = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/dashboard/ExecutionArchiveInstantFrame.tsx'),
            'utf8',
        );
        expect(instantFrame).toContain('EXECUTION_ARCHIVE_SEARCH_SHELL');
        expect(instantFrame).toContain('EXECUTION_SEGMENT_BTN_INACTIVE');
        expect(instantFrame).not.toContain('ARCHIVE_SEGMENT_BTN_INACTIVE');
        expect(instantFrame).toContain('EXECUTION_ARCHIVE_INSTANT_HEADER');
        expect(instantFrame).toContain('ExecutionArchiveCardPaintSlot');
        expect(instantFrame).not.toContain('ExecutionArchiveToolbar');
        expect(instantFrame).not.toContain('ExecutionArchiveLifecycleBars');
        expect(instantFrame).not.toContain('ExecutionArchiveBoxMark');
        expect(instantFrame).not.toContain("from '@/app/components/ui/icons/");
        expect(instantFrame).not.toContain('lucide-react');
        expect(instantFrame).not.toContain("from '@/app/components/lawyer/dashboard/homeStemIcons'");
        expect(instantFrame).toContain('executionArchiveMarks');
        expect(instantFrame).not.toContain("from '@/app/runtime/hubArchiveLoader'");
        const marks = read('executionArchiveMarks.tsx');
        expect(marks).not.toContain("from 'lucide-react'");
        expect(marks).toContain('M5 17h14v-1.76');
        expect(marks).toContain('M2 12s3-7 10-7');
    });

    it('غطاء أول إطار توأم للإطار الحي بلا Toolbar ولا محرّك أرشيف', () => {
        const cover = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/dashboard/ExecutionArchiveInstantPaintCover.tsx'),
            'utf8',
        );
        const frame = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/dashboard/ExecutionArchiveInstantFrame.tsx'),
            'utf8',
        );
        expect(cover).toContain('ExecutionArchiveInstantFrame');
        expect(cover).toContain('includeHeader');
        expect(cover).not.toContain("from '@/app/runtime/hubArchiveLoader'");
        expect(cover).not.toContain('ExecutionArchiveToolbar');
        expect(cover).not.toContain('ExecutionSmartCard');
        expect(frame).toContain('مخزن الأضابير التنفيذية');
        expect(frame).toContain('min-h-[44px]');
        expect(frame).toContain('executions-lifecycle-row');
        expect(frame).toContain('execution-archive-search-deck');
        expect(frame).toContain('executions-add-new');
        expect(frame).toContain('readArchiveGridWidthGuess');
    });

    it('isEvictionClaim معزول بلا state machine', () => {
        const src = readFileSync(resolve(process.cwd(), 'src/app/utils/isEvictionClaim.ts'), 'utf8');
        expect(src).toContain('export function isEvictionClaim');
        expect(src).not.toMatch(/^import /m);
        expect(src).not.toContain('executionStateMachine');
        expect(src).not.toContain('executionModuleStrategies');
    });
});
