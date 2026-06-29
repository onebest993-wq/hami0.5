import fs from 'fs';

const keysContent = fs.readFileSync(
    'src/app/components/lawyer/ExecutionDashboard/hooks/pickSeizedPropertyPortalProps.ts',
    'utf8',
);
const keys = [...keysContent.matchAll(/'([a-zA-Z0-9_]+)'/g)]
    .map((m) => m[1])
    .filter((k) => k.startsWith('seized') || k.startsWith('set') || k === 'executionData' || k.startsWith('save') || k.startsWith('link') || k.startsWith('publication') || k.startsWith('seizure'));

const shorthand = keys.map((k) => `                        ${k},`).join('\n');

const mainReplacement = `                <ExecutionDashboardSeizedPropertyPortals
                    {...pickSeizedPropertyPortalProps({
${shorthand}
                    })}
                />`;

const phoneReplacement = `                <ExecutionDashboardSeizedPropertyPortals {...pickSeizedPropertyPortalProps(props)} />`;

function findPortalBlock(lines) {
    let startIdx = -1;
    let endIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (
            lines[i].includes('{seizedPropertyStepModalOpen &&') &&
            lines[i + 1]?.includes('seizedPropertyStepEntityKind')
        ) {
            startIdx = i;
        }
        if (startIdx >= 0 && lines[i].includes('{publicationModalOpen &&')) {
            for (let j = i; j < Math.min(i + 90, lines.length); j++) {
                if (lines[j].trim() === ': null}') {
                    endIdx = j;
                    break;
                }
            }
            if (endIdx >= 0) break;
        }
    }
    return { startIdx, endIdx };
}

function ensureImport(content, needle, importLine) {
    if (content.includes(needle)) return content;
    return content.replace(
        "import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';",
        importLine,
    );
}

function patchFile(filePath, replacement, importBlock) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const { startIdx, endIdx } = findPortalBlock(lines);
    if (startIdx < 0 || endIdx < 0) {
        console.error('markers not found in', filePath, startIdx, endIdx);
        process.exit(1);
    }
    const newLines = [...lines.slice(0, startIdx), replacement, ...lines.slice(endIdx + 1)];
    let out = newLines.join('\n');
    out = ensureImport(out, 'ExecutionDashboardSeizedPropertyPortals', importBlock);
    fs.writeFileSync(filePath, out);
    console.log('patched', filePath, 'removed lines', endIdx - startIdx + 1);
}

patchFile(
    'src/app/components/lawyer/ExecutionDashboard.tsx',
    mainReplacement,
    "import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';\nimport { ExecutionDashboardSeizedPropertyPortals } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardSeizedPropertyPortals';\nimport { pickSeizedPropertyPortalProps } from '@/app/components/lawyer/ExecutionDashboard/hooks/pickSeizedPropertyPortalProps';",
);

patchFile(
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBody.tsx',
    phoneReplacement,
    "import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';\nimport { ExecutionDashboardSeizedPropertyPortals } from './ExecutionDashboardSeizedPropertyPortals';\nimport { pickSeizedPropertyPortalProps } from '../hooks/pickSeizedPropertyPortalProps';",
);
