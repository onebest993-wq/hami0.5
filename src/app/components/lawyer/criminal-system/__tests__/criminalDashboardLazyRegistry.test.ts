import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
    prefetchCriminalDashboardTab,
    prefetchCriminalDashboardDefaultTab,
} from '@/app/components/lawyer/criminal-system/criminalDashboardLazyRegistry';

describe('criminalDashboardLazyRegistry', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('prefetchCriminalDashboardTab لا يرمي في المتصفح', async () => {
        await expect(async () => {
            prefetchCriminalDashboardTab('legal_codes');
            await new Promise((r) => setTimeout(r, 0));
        }).not.toThrow();
    });

    it('prefetchCriminalDashboardDefaultTab يستهدف tab القرارات', async () => {
        await expect(async () => {
            prefetchCriminalDashboardDefaultTab();
            await new Promise((r) => setTimeout(r, 0));
        }).not.toThrow();
    });

    it('نية تبويب الطلبات تُسخّن المحركات الثقيلة (وليس idle الـ store)', () => {
        const registryPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/criminalDashboardLazyRegistry.ts',
        );
        const source = fs.readFileSync(registryPath, 'utf8');
        expect(source).toContain('prefetchCriminalHeavyEnginesOnTabIntent');
        expect(source).toMatch(/requests:\s*\(\)\s*=>\s*\{[\s\S]*prefetchCriminalHeavyEnginesOnTabIntent/);
        expect(source).toContain('LazyTrialsTab');
        expect(source).toMatch(/requests:\s*\(\)\s*=>\s*\{[\s\S]*LazyTrialsTab\.preload/);
    });

    it('RequestsTab لا يستورد TrialsTab بشكل ثابت', () => {
        const tabPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/CriminalDashboardRequestsTab.tsx',
        );
        const listPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/CriminalDashboardRequestsTabDecisionsList.tsx',
        );
        const source = fs.readFileSync(tabPath, 'utf8');
        const listSource = fs.readFileSync(listPath, 'utf8');
        expect(source).not.toMatch(/import\s*\{\s*TrialsTab\s*\}\s*from/);
        expect(listSource).not.toMatch(/import\s*\{\s*TrialsTab\s*\}\s*from/);
        // LazyTrialsTab peels into the decisions-list section (host stays orchestration-only).
        expect(listSource).toContain('LazyTrialsTab');
    });

    it('RequestsTab يستورد مرشّحات الجلسات من trialSessionsDisplay لا المحرّك الثقيل', () => {
        const tabPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/CriminalDashboardRequestsTab.tsx',
        );
        const source = fs.readFileSync(tabPath, 'utf8');
        expect(source).toContain("from './trialSessionsDisplay'");
        expect(source).not.toMatch(/from ['"]\.\/trialSessionsEngine['"]/);
    });

    it('RequestsTabData + TrialHearingDate* تسحب المساعدات الخفيفة من trialSessionsDisplay', () => {
        const dataPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/useCriminalDashboardRequestsTabData.ts',
        );
        const hintPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/components/TrialHearingDateHint.tsx',
        );
        const modalPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/components/modals/TrialHearingDateModal.tsx',
        );
        const dataSrc = fs.readFileSync(dataPath, 'utf8');
        const hintSrc = fs.readFileSync(hintPath, 'utf8');
        const modalSrc = fs.readFileSync(modalPath, 'utf8');
        expect(dataSrc).toContain("from './trialSessionsDisplay'");
        expect(dataSrc).not.toMatch(/from ['"]\.\/trialSessionsEngine['"]/);
        expect(hintSrc).toContain("from '../trialSessionsDisplay'");
        expect(modalSrc).toContain("from '../../trialSessionsDisplay'");
    });

    it('قشرة الإضبارة لا تُحمّل تبويب الطلبات فوراً — تأخير/نية', () => {
        const prefetchPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/useCriminalDashboardShellPrefetch.ts',
        );
        const registryPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/criminalDashboardLazyRegistry.ts',
        );
        const prefetchSrc = fs.readFileSync(prefetchPath, 'utf8');
        const registrySrc = fs.readFileSync(registryPath, 'utf8');
        expect(registrySrc).toMatch(
            /export function preloadCriminalDashboardShellSurfaces[\s\S]*?LazyCriminalDashboardHeader\.preload[\s\S]*?LazyCriminalPartiesGrid\.preload/,
        );
        expect(registrySrc).not.toMatch(
            /export function preloadCriminalDashboardShellSurfaces[\s\S]{0,400}LazyCriminalDashboardRequestsTab\.preload/,
        );
        expect(prefetchSrc).toContain('preloadCriminalDashboardRequestsTabSurface');
        expect(prefetchSrc).toMatch(/scheduleIdleWork\(\(\)\s*=>\s*\{\s*preloadCriminalDashboardRequestsTabSurface/);
    });

    it('ModalsHost يسحب StageCloser/RequestsEntry من lazyModals فقط', () => {
        const hostPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/CriminalDashboardModalsHost.tsx',
        );
        const trialPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/CriminalDashboardModalsHostTrial.tsx',
        );
        const requestsPath = path.join(
            process.cwd(),
            'src/app/components/lawyer/criminal-system/CriminalDashboardModalsHostRequests.tsx',
        );
        const hostSource = fs.readFileSync(hostPath, 'utf8');
        const trialSource = fs.readFileSync(trialPath, 'utf8');
        const requestsSource = fs.readFileSync(requestsPath, 'utf8');
        expect(hostSource).not.toMatch(/from ['"]\.\/components\/StageCloserModal['"]/);
        expect(hostSource).not.toMatch(/from ['"]\.\/components\/RequestsEntryModal['"]/);
        expect(trialSource).not.toMatch(/from ['"]\.\/components\/StageCloserModal['"]/);
        expect(requestsSource).not.toMatch(/from ['"]\.\/components\/RequestsEntryModal['"]/);
        expect(trialSource).toContain("from './criminalDashboardLazyModals'");
        expect(trialSource).toContain('StageCloserModal');
        expect(requestsSource).toContain("from './criminalDashboardLazyModals'");
        expect(requestsSource).toContain('RequestsEntryModal');
    });
});
