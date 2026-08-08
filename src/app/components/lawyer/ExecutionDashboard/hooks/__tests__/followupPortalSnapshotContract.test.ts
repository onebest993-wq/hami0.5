import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
    EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS,
    type ExecutionFollowupSnapshotFieldKey,
    type FollowupModalSnapshot,
} from '../../followupSnapshotFieldKeys';
import {
    FOLLOWUP_PORTAL_OPTIONAL_COMPONENT_KEYS,
    extractFollowupPortalControllerKeys,
    findPortalKeysMissingFromSnapshot,
} from '../../utils/followupPortalSnapshotContract';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../../..');

describe('followupPortalSnapshotContract', () => {
    it('snapshot field keys are unique and substantial', () => {
        const unique = new Set(EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS);
        expect(unique.size).toBe(EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS.length);
        expect(EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS.length).toBeGreaterThan(100);
    });

    it('portal controller destructuring keys are subset of generated snapshot keys', () => {
        const controllerPath =
            'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionFollowupModalPortalController.ts';
        const keysPath = 'src/app/components/lawyer/ExecutionDashboard/followupSnapshotFieldKeys.ts';
        const controllerSource = fs.readFileSync(path.join(repoRoot, controllerPath), 'utf8');
        const keysSource = fs.readFileSync(path.join(repoRoot, keysPath), 'utf8');
        const { portalKeys, missing } = findPortalKeysMissingFromSnapshot({
            controllerSource,
            keysSource,
        });
        expect(portalKeys.length).toBeGreaterThan(80);
        expect(missing).toEqual([]);
    });

    it('optional portal component overrides are excluded from contract', () => {
        const controllerSource = fs.readFileSync(
            path.join(
                repoRoot,
                'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionFollowupModalPortalController.ts',
            ),
            'utf8',
        );
        const portalKeys = extractFollowupPortalControllerKeys(controllerSource);
        for (const key of FOLLOWUP_PORTAL_OPTIONAL_COMPONENT_KEYS) {
            expect(portalKeys).toContain(key);
        }
    });

    it('FollowupModalSnapshot accepts known keys only (type-level)', () => {
        const sample: FollowupModalSnapshot = {
            claimType: 'استحصال دين مالي',
            unifiedModalTab: 'seizure_requests',
        };
        const key: ExecutionFollowupSnapshotFieldKey = 'executionData';
        expect(sample[key]).toBeUndefined();
        expect(EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS.includes(key)).toBe(true);
    });
});
