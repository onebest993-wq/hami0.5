import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const components = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/components',
);

function lineCount(filePath: string): number {
    return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length;
}

describe('Phase 2 seizure movable/property dedup honesty', () => {
    it('نواة InlineSections مشتركة مع assetKind؛ الأغلفة رفيعة', () => {
        const core = path.join(
            components,
            'seizureInlineSections/SeizureInlineSectionsCore.tsx',
        );
        const movable = path.join(components, 'MovableSeizureInlineSections.tsx');
        const property = path.join(components, 'PropertySeizureInlineSections.tsx');

        expect(fs.existsSync(core)).toBe(true);
        const coreSrc = fs.readFileSync(core, 'utf8');
        const sharedPath = path.join(
            components,
            'seizureInlineSections/seizureInlineSectionsShared.tsx',
        );
        const sharedSrc = fs.readFileSync(sharedPath, 'utf8');
        const packageSrc = `${coreSrc}\n${sharedSrc}`;
        expect(sharedSrc).toContain('assetKind: SeizureAssetKind');
        expect(packageSrc).toContain("assetKind === 'movable'");
        expect(packageSrc).toContain("assetKind === 'property'");
        expect(coreSrc).toContain("from './seizureInlineSectionsShared'");

        const movableSrc = fs.readFileSync(movable, 'utf8');
        const propertySrc = fs.readFileSync(property, 'utf8');
        expect(movableSrc).toContain('SeizureInlineSectionsCore');
        expect(movableSrc).toContain('assetKind="movable"');
        expect(propertySrc).toContain('SeizureInlineSectionsCore');
        expect(propertySrc).toContain('assetKind="property"');
        expect(movableSrc).toContain('export const MovableSeizureInlineSections');
        expect(propertySrc).toContain('export const PropertySeizureInlineSections');
        expect(movableSrc).toContain('export type MovableInlineSectionKey');
        expect(propertySrc).toContain('export type PropertyInlineSectionKey');

        expect(lineCount(movable)).toBeLessThan(60);
        expect(lineCount(property)).toBeLessThan(60);
        expect(lineCount(core)).toBeLessThan(700);
        expect(lineCount(core)).toBeGreaterThan(200);
        const shared = path.join(components, 'seizureInlineSections/seizureInlineSectionsShared.tsx');
        expect(fs.existsSync(shared)).toBe(true);
        expect(lineCount(shared)).toBeLessThan(400);
        expect(fs.readFileSync(core, 'utf8')).toContain("from './seizureInlineSectionsShared'");
    });

    it('نواة لوحة المسار مشتركة مع assetKind؛ الأغلفة رفيعة', () => {
        const core = path.join(
            components,
            'seizedAssetWorkflow/useSeizedAssetWorkflowPanelState.tsx',
        );
        const panelStateDir = path.join(components, 'seizedAssetWorkflow/panelState');
        const movable = path.join(
            components,
            'seizedMovableWorkflow/useSeizedMovableWorkflowPanelState.tsx',
        );
        const property = path.join(
            components,
            'seizedPropertyWorkflow/useSeizedPropertyWorkflowPanelState.tsx',
        );

        expect(fs.existsSync(core)).toBe(true);
        expect(fs.existsSync(panelStateDir)).toBe(true);
        const coreSrc = fs.readFileSync(core, 'utf8');
        expect(coreSrc).toContain('useSeizedAssetWorkflowPanelState');
        expect(coreSrc).toContain("from './panelState/useSeizedAssetWorkflowFoundation'");
        expect(coreSrc).toContain("from './panelState/useSeizedAssetWorkflowHandlers'");
        expect(coreSrc).toContain("from './panelState/useSeizedAssetWorkflowSteps'");

        const typesSrc = fs.readFileSync(
            path.join(panelStateDir, 'seizedAssetWorkflowPanelStateTypes.ts'),
            'utf8',
        );
        expect(typesSrc).toContain("assetKind: 'movable'");
        expect(typesSrc).toContain("assetKind: 'property'");

        const movableSrc = fs.readFileSync(movable, 'utf8');
        const propertySrc = fs.readFileSync(property, 'utf8');
        expect(movableSrc).toContain('useSeizedAssetWorkflowPanelState');
        expect(movableSrc).toContain("assetKind: 'movable'");
        expect(propertySrc).toContain('useSeizedAssetWorkflowPanelState');
        expect(propertySrc).toContain("assetKind: 'property'");
        expect(movableSrc).toContain('export function useSeizedMovableWorkflowPanelState');
        expect(propertySrc).toContain('export function useSeizedPropertyWorkflowPanelState');

        expect(lineCount(movable)).toBeLessThan(25);
        expect(lineCount(property)).toBeLessThan(25);
        expect(lineCount(core)).toBeLessThan(80);
        expect(lineCount(core)).toBeGreaterThan(15);

        const extracted = [
            'seizedAssetWorkflowPanelStateTypes.ts',
            'useSeizedAssetWorkflowFoundation.ts',
            'useSeizedAssetWorkflowHandlers.tsx',
            'useSeizedAssetWorkflowSteps.tsx',
        ];
        for (const name of extracted) {
            const n = lineCount(path.join(panelStateDir, name));
            expect(n, name).toBeLessThan(700);
            expect(n, name).toBeGreaterThan(20);
        }
        const domainLines = extracted.reduce(
            (sum, name) => sum + lineCount(path.join(panelStateDir, name)),
            0,
        );
        expect(domainLines).toBeGreaterThan(400);
    });
});
