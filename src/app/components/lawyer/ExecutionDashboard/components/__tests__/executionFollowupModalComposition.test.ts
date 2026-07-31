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
    it('View composes Shell + TabPanels only', () => {
        const view = fs.readFileSync(path.join(componentsDir, 'ExecutionFollowupModalView.tsx'), 'utf8');
        expect(view).toContain('ExecutionFollowupModalShell');
        expect(view).toContain('ExecutionFollowupModalTabPanels');
        expect(view).not.toContain('FollowupTabKeepAlivePanel');
        expect(view.split('\n').length).toBeLessThan(40);
    });

    it('TabPanels orchestrates personal/mid/late groups', () => {
        const panels = fs.readFileSync(
            path.join(componentsDir, 'ExecutionFollowupModalTabPanels.tsx'),
            'utf8',
        );
        expect(panels).toContain('ExecutionFollowupModalPersonalCoercivePanels');
        expect(panels).toContain('ExecutionFollowupModalMidPanels');
        expect(panels).toContain('ExecutionFollowupModalLatePanels');
        expect(panels.split('\n').length).toBeLessThan(40);
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
        expect(portal).toContain('ExecutionFollowupModalShell');
        expect(portal).toContain('ExecutionFollowupModalTabPanels');
        expect(portal).toContain('useExecutionFollowupModalPortalController');
        expect(portal.split('\n').length).toBeLessThan(40);
        const shell = fs.readFileSync(
            path.join(componentsDir, 'ExecutionFollowupModalShell.tsx'),
            'utf8',
        );
        expect(shell).toContain('data-testid="execution-followup-modal"');
        expect(shell).toContain('data-testid="execution-followup-modal-close"');
    });
});
