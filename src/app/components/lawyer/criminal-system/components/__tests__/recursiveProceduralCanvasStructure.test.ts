import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MAIN_FILE = path.resolve(__dirname, '../RecursiveProceduralCanvas.tsx');
const CANVAS_DIR = path.resolve(__dirname, '../RecursiveProceduralCanvas');

const mainFileSource = fs.readFileSync(MAIN_FILE, 'utf8');
const MAIN_FILE_LINE_COUNT = mainFileSource.split('\n').length;

const EXTRACTED_MODULES: Array<{ file: string; exportName: string }> = [
    { file: 'dragUtils.ts', exportName: 'parseProceduralDrag' },
    { file: 'types.ts', exportName: 'ContainerModalMode' },
    { file: 'primitives.tsx', exportName: 'StructuralIndexPill' },
    { file: 'AttentionBoardColumns.tsx', exportName: 'AttentionColumn' },
    { file: 'ProceduralItemRows.tsx', exportName: 'NoteRow' },
    { file: 'ProceduralItemRows.tsx', exportName: 'ActionRow' },
    { file: 'ProceduralContainerTreeNode.tsx', exportName: 'ProceduralContainerTreeNode' },
    { file: 'canvasHelpers.ts', exportName: 'findEditingContainerInTree' },
    { file: 'useProceduralCanvasFocus.ts', exportName: 'useProceduralCanvasFocus' },
    { file: 'ProceduralCanvasToolbar.tsx', exportName: 'ProceduralCanvasToolbar' },
    { file: 'ProceduralCanvasAttentionBoard.tsx', exportName: 'ProceduralCanvasAttentionBoard' },
    { file: 'ProceduralCanvasTreePanel.tsx', exportName: 'ProceduralCanvasTreePanel' },
    { file: 'ProceduralCanvasModalsHost.tsx', exportName: 'ProceduralCanvasModalsHost' },
];

describe('RecursiveProceduralCanvas extraction', () => {
    it.each(EXTRACTED_MODULES)('$file exists and exports $exportName', ({ file, exportName }) => {
        const filePath = path.join(CANVAS_DIR, file);
        expect(fs.existsSync(filePath)).toBe(true);
        const source = fs.readFileSync(filePath, 'utf8');
        expect(source).toContain(exportName);
    });

    it('main file imports tree panel / tree-context instead of defining renderContainerTree locally', () => {
        expect(mainFileSource).toMatch(
            /ProceduralTreeContext\s*\}?\s*from\s*'\.\/RecursiveProceduralCanvas\/ProceduralContainerTreeNode'/,
        );
        expect(mainFileSource).toContain("from './RecursiveProceduralCanvas/ProceduralCanvasTreePanel'");
        expect(mainFileSource).not.toMatch(/const renderContainerTree = \(/);
        const treePanelSource = fs.readFileSync(
            path.join(CANVAS_DIR, 'ProceduralCanvasTreePanel.tsx'),
            'utf8',
        );
        expect(treePanelSource).toContain('<ProceduralContainerTreeNode');
    });

    it('main file no longer defines the row/primitive components locally', () => {
        for (const symbolName of [
            'NoteRow',
            'ActionRow',
            'StructuralIndexPill',
            'AttentionMicroCard',
            'AttentionColumn',
            'RowMenu',
        ]) {
            const localConstPattern = new RegExp(`const ${symbolName} = \\(`);
            expect(mainFileSource).not.toMatch(localConstPattern);
        }
    });

    it('keeps the public export name RecursiveProceduralCanvas stable', () => {
        expect(mainFileSource).toContain('export const RecursiveProceduralCanvas = (');
        expect(mainFileSource).toContain('export type RecursiveProceduralCanvasProps');
    });

    it('stays within the ≤1000 line budget after extraction', () => {
        expect(MAIN_FILE_LINE_COUNT).toBeLessThanOrEqual(1000);
    });
});
