import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('LawyerDashboardWorkspaceProvider — stemRef race seal', () => {
    it('does not overwrite stemRef from React stem state on every render', () => {
        const src = readFileSync(
            path.resolve(
                process.cwd(),
                'src/app/hooks/lawyerDashboard/LawyerDashboardWorkspaceProvider.tsx',
            ),
            'utf8',
        );
        expect(src).not.toMatch(/stemRef\.current\s*=\s*stem\s*;/);
        expect(src).toContain('STEM_STUB.commitLawsuitLifecycleMutation');
        expect(src).toContain('isStemCommitLive');
    });
});
