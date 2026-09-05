import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const componentsDir = path.join(
    process.cwd(),
    'src/app/components/lawyer/ExecutionDashboard/components',
);
const portalPath = path.join(
    process.cwd(),
    'src/app/components/lawyer/ExecutionDashboard/ExecutionFollowupModalPortal.tsx',
);

describe('ExecutionFollowupModal composition', () => {
    it('TabPanels orchestrates personal/mid/late groups', () => {
        const panels = fs.readFileSync(
            path.join(componentsDir, 'ExecutionFollowupModalTabPanels.tsx'),
            'utf8',
        );
        expect(panels).toContain('ExecutionFollowupModalPersonalCoercivePanels');
        expect(panels).toContain('ExecutionFollowupModalMidPanels');
        expect(panels).toContain('ExecutionFollowupModalLatePanels');
        expect(panels).toContain("p.has('seizure_requests')");
        expect(panels.split('\n').length).toBeLessThan(40);
        const personalCoercive = fs.readFileSync(
            path.join(componentsDir, 'ExecutionFollowupModalPersonalCoercivePanels.tsx'),
            'utf8',
        );
        expect(personalCoercive).toContain("panelsToRender.has('personal')");
        expect(personalCoercive).toContain("panelsToRender.has('coercive')");
        const late = fs.readFileSync(
            path.join(componentsDir, 'ExecutionFollowupModalLatePanels.tsx'),
            'utf8',
        );
        expect(late).toContain("p.has('correspondences')");
        expect(late).toContain("p.has('dossier_controls')");
        expect(late).toContain("p.has('admin')");
        for (const name of [
            'ExecutionFollowupModalPersonalCoercivePanels.tsx',
            'ExecutionFollowupModalMidPanels.tsx',
            'ExecutionFollowupModalLatePanels.tsx',
        ]) {
            expect(fs.existsSync(path.join(componentsDir, name))).toBe(true);
        }
    });

    it('المسار الحي (Portal) يفوّض Shell + TabPanels مع الحفاظ على createPortal', () => {
        const portal = fs.readFileSync(portalPath, 'utf8');
        const lazy = fs.readFileSync(
            path.join(
                process.cwd(),
                'src/app/components/lawyer/ExecutionDashboard/executionFollowupModalLazy.tsx',
            ),
            'utf8',
        );
        expect(lazy).toContain("import('./ExecutionFollowupModalPortal')");
        expect(portal).toContain('createPortal');
        expect(portal).toContain('ExecutionFollowupModalView');
        expect(portal).toContain('useExecutionFollowupModalPortalController');
        expect(portal.split('\n').length).toBeLessThan(25);
        const view = fs.readFileSync(
            path.join(componentsDir, 'ExecutionFollowupModalView.tsx'),
            'utf8',
        );
        expect(view).toContain('ExecutionFollowupModalShell');
        expect(view).toContain('ExecutionFollowupModalTabPanels');
        const shell = fs.readFileSync(
            path.join(componentsDir, 'ExecutionFollowupModalShell.tsx'),
            'utf8',
        );
        expect(shell).toContain('data-testid="execution-followup-modal"');
        expect(shell).toContain('data-testid="execution-followup-modal-close"');
        expect(shell).toContain('useOverlayEscapeDismiss');
        const host = fs.readFileSync(
            path.join(componentsDir, 'ExecutionFollowupModalHost.tsx'),
            'utf8',
        );
        expect(host).toContain('LazyExecutionFollowupModalPortal');
        expect(host).toContain('EMPTY_FOLLOWUP_MODAL_SNAPSHOT');
        expect(host).toContain('ExecutionFollowupInstantFrame');
        expect(host).toContain('key={dossierKey || \'followup-open\'}');
        expect(host).not.toContain("from '../ExecutionFollowupModalPortal'");
        expect(host).not.toContain("prefetchExecutionFollowupTab('coercive')");
        expect(host).not.toContain(": 'seizure_requests'");
        const overlayEntry = fs.readFileSync(
            path.join(componentsDir, 'ExecutionFollowupOverlayEntry.tsx'),
            'utf8',
        );
        expect(overlayEntry).toContain('useExecutionFollowupModalSnapshot');
        const clusters = fs.readFileSync(
            path.join(componentsDir, 'ExecutionDashboardChunkHostClusters.tsx'),
            'utf8',
        );
        expect(clusters).toContain('ExecutionFollowupOverlayEntry');
        expect(clusters).not.toContain('جاري تحميل محضر المتابعة');
        const overlays = fs.readFileSync(
            path.join(componentsDir, 'ExecutionDashboardShellOverlays.tsx'),
            'utf8',
        );
        expect(overlays).not.toContain('ExecutionFollowupModalHost');
    });
});
