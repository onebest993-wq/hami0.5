import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    EXECUTION_ACTION_LAW_ROW_CLASS,
    EXECUTION_ACTION_TILE_CLASS,
} from '@/app/components/lawyer/ExecutionDashboard/executionDossierVisualLite';
import { dossierLifecycleBadgeAr } from '@/app/components/lawyer/ExecutionDashboard/helpers/dossierLifecycleUtils';

const dash = resolve(__dirname, '..');

function read(rel: string) {
    return readFileSync(resolve(dash, rel), 'utf8');
}

describe('execution dossier visual lite (explicit design permission)', () => {
    it('بلاطات الأدوات صف 44px لا عمود 92px', () => {
        expect(EXECUTION_ACTION_TILE_CLASS).toContain('min-h-[44px]');
        expect(EXECUTION_ACTION_TILE_CLASS).not.toContain('min-h-[92px]');
        expect(EXECUTION_ACTION_TILE_CLASS).toContain('rounded-lg');
        expect(EXECUTION_ACTION_LAW_ROW_CLASS).toContain('min-h-[44px]');
        expect(EXECUTION_ACTION_LAW_ROW_CLASS).not.toContain('min-h-[52px]');
        const tiles = read('ActionGridSectionTiles.tsx');
        expect(tiles).not.toContain('min-h-[92px]');
        expect(tiles).not.toContain('min-h-[52px]');
        expect(tiles).not.toContain('min-h-[100px]');
        expect(tiles).toContain('EXECUTION_ACTION_TILE_CLASS');
        expect(read('ActionGridSection.tsx')).toContain('EXECUTION_ACTION_TILE_TONES');
        expect(read('ActionGridSection.tsx')).toContain('EXECUTION_DOSSIER_ACTION_GRID_SHELL');
        expect(read('ActionGridSection.tsx')).not.toContain('border-[#E6C673]/14');
    });

    it('إطار الأطراف والهيدر بلا ظل rounded-2xl ثقيل وبدون تداخل أزرار الهاتف', () => {
        const frame = read('ExecutionPartyCardFrame.tsx');
        expect(frame).toContain('EXECUTION_PARTY_FRAME_BASE');
        expect(frame).toContain('min-h-[44px]');
        expect(frame).not.toContain('shadow-sm');
        expect(frame).not.toContain('rounded-2xl');
        expect(frame).not.toContain('bg-[#0B1120]/55');
        const visualLite = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/ExecutionDashboard/executionDossierVisualLite.ts'),
            'utf8',
        );
        expect(visualLite).toContain('rounded-lg');
        expect(visualLite).toContain('2.75rem_2.75rem');
        expect(visualLite).not.toContain('2.25rem_2.25rem');
        const header = read('DashboardHeaderSection.tsx');
        expect(header).not.toContain('shadow-sm');
        expect(header).toContain('min-h-[44px]');
        expect(header).not.toContain('rounded-2xl');
        expect(header).toContain('EXECUTION_DOSSIER_SUMMARY_TOGGLE');
        expect(header).not.toContain('border-amber-500/35');
        expect(visualLite).toContain('border-amber-500/22');
        expect(read('DashboardHeaderExpandedDetails.tsx')).toContain('EXECUTION_DOSSIER_SUMMARY_EXPANDED');
        expect(read('TimelineSection.tsx')).not.toContain('shadow-sm');
        expect(read('TimelineSection.tsx')).toContain('min-h-[44px]');
        expect(read('TimelineSection.tsx')).toContain('bg-transparent');
        const phoneHeader = read('ExecutionDashboardPhoneBodyHeader.tsx');
        expect(phoneHeader).toContain('EXECUTION_DOSSIER_PHONE_HEADER_GRID');
        expect(phoneHeader).toContain('EXECUTION_DOSSIER_CONSULT_BTN');
        expect(phoneHeader).toContain('EXECUTION_DOSSIER_TRASH_BTN');
        expect(phoneHeader).not.toContain('2.25rem_2.25rem');
        expect(phoneHeader).not.toContain('group-hover:scale-105');
        const instant = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/dashboard/ExecutionDossierInstantChrome.tsx'),
            'utf8',
        );
        expect(instant).not.toContain('shadow-2xl');
        expect(instant).not.toContain('backdrop-blur-3xl');
        expect(instant).not.toContain('bg-gradient-to-br');
        expect(instant).toContain('ExecutionDossierInstantFrame');
        expect(instant).not.toContain('animate-pulse');
        expect(instant).not.toContain('ExecutionDossierHeaderNavButtons');
        const instantFrame = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/dashboard/ExecutionDossierInstantFrame.tsx'),
            'utf8',
        );
        expect(instantFrame).not.toContain('animate-pulse');
        expect(instantFrame).not.toContain("from '@/app/components/ui/icons/");
        expect(instantFrame).toContain('min-h-[44px]');
        expect(instantFrame).toContain('EXECUTION_DOSSIER_PHONE_HEADER_GRID');
        expect(instantFrame).not.toContain('2.25rem_2.25rem');
        const statusViews = read('ExecutionDashboardStatusViews.tsx');
        expect(statusViews).toContain('ExecutionDossierInstantFrame');
        expect(statusViews).not.toContain('animate-pulse');
        expect(statusViews).toContain('min-h-[44px]');
        expect(statusViews).toContain('touch-manipulation');
        const lazyUi = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShellUi.tsx'),
            'utf8',
        );
        expect(lazyUi).not.toContain('animate-pulse');
        expect(lazyUi).toContain('EXEC_ACTION_GRID_LAZY_FALLBACK');
        expect(lazyUi).toContain('min-h-[44px]');
        expect(read('DashboardHeaderStatusBanners.tsx')).not.toContain('animate-pulse');
        expect(read('DashboardHeaderStatusBanners.tsx')).not.toContain('shadow-lg');
        expect(read('DashboardHeaderStatusBanners.tsx')).not.toContain('bg-gradient-to-r');
    });

    it('شارة دورة الحياة بلا إيموجي', () => {
        expect(dossierLifecycleBadgeAr('active')).toBe('نشطة');
        expect(dossierLifecycleBadgeAr('paused')).toBe('متوقفة');
        expect(read('DossierLifecyclePanel.tsx')).not.toContain('🟢');
        expect(read('DossierLifecyclePanel.tsx')).toContain('dossierLifecycleLabelAr(s)');
    });
});
