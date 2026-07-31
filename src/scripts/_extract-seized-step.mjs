/**
 * Extract SeizedPropertyWorkflowPanel step content into separate module.
 */
import fs from 'fs';

const panelPath =
    'src/app/components/lawyer/ExecutionDashboard/components/SeizedPropertyWorkflowPanel.tsx';
const outPath =
    'src/app/components/lawyer/ExecutionDashboard/components/seizedPropertyWorkflowStepContent.tsx';

const src = fs.readFileSync(panelPath, 'utf8');

const helpersStart = src.indexOf('const BTN =');
const helpersEnd = src.indexOf('export type SeizedPropertyWorkflowPanelProps');
if (helpersStart < 0) {
    // maybe props type has different name
}
const propsIdx = src.indexOf('type SeizedPropertyWorkflowPanelProps') >= 0
    ? src.indexOf('type SeizedPropertyWorkflowPanelProps')
    : src.indexOf('export interface SeizedPropertyWorkflowPanelProps') >= 0
      ? src.indexOf('export interface SeizedPropertyWorkflowPanelProps')
      : src.indexOf('}: SeizedPropertyWorkflowPanelProps)');

// Find contentForStepIndex callback
const contentStart = src.indexOf('    const contentForStepIndex = React.useCallback(');
const contentEnd = src.indexOf('    const steps: ExecutionInlineStep[]');
if (contentStart < 0 || contentEnd < 0) {
    throw new Error(`content markers missing ${contentStart} ${contentEnd}`);
}

const contentBlock = src.slice(contentStart, contentEnd).trimEnd();

// Also grab helper functions BTN through inlineSaveShell/doneStepHistoryShell/actionClick/expertSubtype...
const btnStart = src.indexOf('const BTN =');
const componentStart = src.indexOf('export function SeizedPropertyWorkflowPanel');
const helperBlock = src.slice(btnStart, componentStart).trimEnd();

console.log({
    helperLines: helperBlock.split('\n').length,
    contentLines: contentBlock.split('\n').length,
    btnStart,
    componentStart,
});

// For safety this pass: only extract pure helpers used by many things (BTN etc stay)
// and convert contentForStepIndex to exported function — too coupled.
// Instead: move helper shells + export render function that takes deps.

fs.writeFileSync(
    'scripts/_seized-extract-debug.json',
    JSON.stringify(
        {
            helperHead: helperBlock.slice(0, 300),
            contentHead: contentBlock.slice(0, 300),
            helperLines: helperBlock.split('\n').length,
            contentLines: contentBlock.split('\n').length,
        },
        null,
        2,
    ),
);
console.log('debug written — aborting full extract pending deps analysis');
