/**
 * Phase B slice 4 — decisionsSeizureEvictionScopeBag + workspaceScopeBag
 * يفرّغ استدعاء dynamic scope تقريباً (288 → 0 مفتاح مباشر)
 */
import fs from 'node:fs';
import path from 'node:path';
import {
    CORE_PATH,
    DYNAMIC_SCOPE_PATH,
    extractBalancedBlock,
    extractShorthandKeys,
    getModalKeySet,
    readDynamicScopeCallKeys,
    rebuildScopeCall,
    removeKeysFromDynamicScope,
    transformShorthandLines,
    writeBagFile,
} from './lib/phaseBScopeBagUtils.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const RESOLVER = path.join(ROOT, 'scripts/lib/resolveExecutionChunkScopeKeys.mjs');

const OPERATIONAL_PATTERN =
    /decision|Decision|appeal|Appeal|seizure|Seizure|seized|Seized|eviction|Eviction|grace|Grace|guarantor|Guarantor|judicialCustodian|executorSchedule|executorApproval|realEstate|movableSeizure|propertySeizure|thirdParty|ThirdParty|partyDeath|alimonyBeneficiary|residentialGrace|residentialVacate|seizureMark|seizureLog|unifiedSeizure|releaseSeizure|focusSeizure|openExecutionSeizures|saveRealEstate|saveSeizedProperty|saveSeizure|submitMovable|submitProperty|submitEviction|completeEviction|handleDeclareEviction|handleDeclareNotice|handleSpecialCases|pauseReason|isPaused|setIsPaused|handleResume|evictionExecutor|graceModal|gracePeriod|graceHidden|isGracePeriod|computeDaysRemaining|computeDeadline|computeTaklif|noticeKind|subsequentNotice|debtorNotifiedForEviction|isEvictionGrace|evictionGrace|evictionAssets|evictionFull|evictionProperty|openEviction|FollowupModalContext|executionReportPrompt|setExecutorSchedule|setGraceModal|setManualGrace|setEvictionGrace|setPartyDeath|setGuarantor|handleGuarantor|handlePartyDeath|handleAlimony|handleCreditorDeath|handleDebtorDeath|persistGuarantor|appendGuarantor|archiveAndClearGuarantor|shouldShowGuarantor|openGuarantor|beginThirdParty|cancelThirdParty|confirmThirdParty|updateThirdParty|setThirdParty|removeJudicial|setJudicial|setSeizedProperty|setSeizureMark|setSeizureDraft|seizureDrafts|activeDebtorNoticeScope|lawyerStartedPostNotice|debtorNotificationDate|debtorEvaded|debtorNotified|editPartyTarget|openEditParty|handleSettlement|residentialGraceModal|initialFileNumber/i;

const NEW_BAGS = [
    {
        varName: 'decisionsSeizureEvictionScopeBag',
        fnName: 'buildExecutionDashboardDecisionsSeizureEvictionScopeBag',
        typeName: 'ExecutionDashboardDecisionsSeizureEvictionScopeBagInput',
        fileName: 'buildExecutionDashboardDecisionsSeizureEvictionScopeBag.ts',
        comment: 'Phase B — قرارات / استئناف / حجز / إخلاء / ضمان / إيقاف لـ chunk scope',
        match: (k) => OPERATIONAL_PATTERN.test(k),
    },
    {
        varName: 'workspaceScopeBag',
        fnName: 'buildExecutionDashboardWorkspaceScopeBag',
        typeName: 'ExecutionDashboardWorkspaceScopeBagInput',
        fileName: 'buildExecutionDashboardWorkspaceScopeBag.ts',
        comment: 'Phase B — هوية الإضبارة / الأطراف / التبويبات / الحالة لـ chunk scope',
        match: () => true,
    },
];

const BAG_DIR = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore',
);

function writeBag(keys, bag) {
    writeBagFile(
        path.join(BAG_DIR, bag.fileName),
        bag.fnName,
        bag.typeName,
        bag.comment,
        keys,
    );
}

function patchResolver(resolverSrc, bags) {
    let next = resolverSrc;
    for (const bag of bags) {
        const pathConst = `${bag.varName.toUpperCase()}_PATH`;
        if (next.includes(pathConst)) continue;

        next = next.replace(
            'const TIMELINE_DOSSIER_BAG_PATH =',
            `const ${pathConst} =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/${bag.fileName}';
const TIMELINE_DOSSIER_BAG_PATH =`,
        );

        const fnName = `extract${bag.varName.charAt(0).toUpperCase()}${bag.varName.slice(1)}Keys`;
        next = next.replace(
            'function extractTimelineDossierBagKeys(core) {',
            `function ${fnName}(core) {
    const keys = new Set();
    const marker = '${bag.fnName}({';
    const start = core.indexOf(marker);
    if (start >= 0) {
        const open = start + marker.length - 1;
        const body = extractBalancedBlock(core, open);
        for (const k of extractExplicitScopeKeys(body)) keys.add(k);
    }
    if (fs.existsSync(${pathConst})) {
        const src = fs.readFileSync(${pathConst}, 'utf8');
        for (const m of src.matchAll(/^\\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    }
    return keys;
}

function extractTimelineDossierBagKeys(core) {`,
        );

        next = next.replace(
            "    if (spreads.includes('timelineDossierScopeBag') || block.includes('timelineDossierScopeBag')) {",
            `    if (spreads.includes('${bag.varName}') || block.includes('${bag.varName}')) {
        for (const k of ${fnName}(coreSrc)) resolved.add(k);
    }
    if (spreads.includes('timelineDossierScopeBag') || block.includes('timelineDossierScopeBag')) {`,
        );
    }
    return next;
}

function patchDynamicScope(dynamicSrc, bagVars, allExtractedKeys) {
    let next = dynamicSrc;
    let afterBag = 'timelineDossierScopeBag';
    for (const varName of bagVars) {
        next = next.replace(
            `    const ${afterBag} = input.${afterBag} as Record<string, unknown>;\n    return {`,
            `    const ${afterBag} = input.${afterBag} as Record<string, unknown>;\n    const ${varName} = input.${varName} as Record<string, unknown>;\n    return {`,
        );
        next = next.replace(
            `        ...${afterBag},\n`,
            `        ...${afterBag},\n        ...${varName},\n`,
        );
        afterBag = varName;
    }
    return removeKeysFromDynamicScope(next, allExtractedKeys);
}

function insertBagBuilds(coreSrc, bagBuildBlocks) {
    let next = coreSrc;
    const anchor = '    const timelineDossierScopeBag = buildExecutionDashboardTimelineDossierScopeBag({';
    if (!next.includes(bagBuildBlocks[0].marker)) {
        next = next.replace(anchor, `${bagBuildBlocks.map((b) => b.block).join('\n\n')}\n\n${anchor}`);
    }
    return next;
}

function ensureImports(coreSrc, bags) {
    let next = coreSrc;
    const anchor =
        "import { buildExecutionDashboardTimelineDossierScopeBag } from './executionDashboardCore/buildExecutionDashboardTimelineDossierScopeBag';";
    for (const bag of bags) {
        if (next.includes(`${bag.fnName}'`)) continue;
        next = next.replace(
            anchor,
            `${anchor}\nimport { ${bag.fnName} } from './executionDashboardCore/${bag.fileName.replace('.ts', '')}';`,
        );
    }
    return next;
}

// --- main ---
let core = fs.readFileSync(CORE_PATH, 'utf8');
const dynamicSrc = fs.readFileSync(DYNAMIC_SCOPE_PATH, 'utf8');
const modalKeys = getModalKeySet(core);
const scopeKeys = readDynamicScopeCallKeys(core);

const operationalKeys = scopeKeys.filter((k) => OPERATIONAL_PATTERN.test(k) && !modalKeys.has(k)).sort();
const workspaceKeys = scopeKeys.filter((k) => !operationalKeys.includes(k)).sort();

console.log('operational keys:', operationalKeys.length);
console.log('workspace keys:', workspaceKeys.length);

writeBag(operationalKeys, NEW_BAGS[0]);
writeBag(workspaceKeys, NEW_BAGS[1]);

const bagBuildBlocks = [
    {
        marker: 'buildExecutionDashboardDecisionsSeizureEvictionScopeBag',
        block: `    const decisionsSeizureEvictionScopeBag = buildExecutionDashboardDecisionsSeizureEvictionScopeBag({
        ${operationalKeys.map((k) => `${k},`).join('\n        ')}
    });`,
    },
    {
        marker: 'buildExecutionDashboardWorkspaceScopeBag',
        block: `    const workspaceScopeBag = buildExecutionDashboardWorkspaceScopeBag({
        ${workspaceKeys.map((k) => `${k},`).join('\n        ')}
    });`,
    },
];

core = insertBagBuilds(core, bagBuildBlocks);
core = ensureImports(core, NEW_BAGS);
core = rebuildScopeCall(core, []);

// Update utils list in rebuild - need to patch phaseBScopeBagUtils SCOPE_BAGS first
// rebuildScopeCall reads from utils file - we'll patch utils separately

fs.writeFileSync(CORE_PATH, core, 'utf8');

const allExtracted = [...operationalKeys, ...workspaceKeys];
let newDynamic = patchDynamicScope(dynamicSrc, NEW_BAGS.map((b) => b.varName), allExtracted);
newDynamic = newDynamic.replace(
    /^\s+[a-zA-Z_][a-zA-Z0-9_]*: input\.[a-zA-Z_][a-zA-Z0-9_]*,\s*$/gm,
    (line) => {
        const m = line.match(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/);
        return m && allExtracted.includes(m[1]) ? '' : line;
    },
);
// Remove any leftover explicit keys block if empty - keep pickExecutionFollowupScopeSlice
fs.writeFileSync(DYNAMIC_SCOPE_PATH, newDynamic, 'utf8');

// Patch phaseBScopeBagUtils SCOPE_BAGS_IN_CALL
const utilsPath = path.join(ROOT, 'scripts/lib/phaseBScopeBagUtils.mjs');
let utils = fs.readFileSync(utilsPath, 'utf8');
if (!utils.includes('decisionsSeizureEvictionScopeBag')) {
    utils = utils.replace(
        "'timelineDossierScopeBag',\n];",
        `'timelineDossierScopeBag',
    'decisionsSeizureEvictionScopeBag',
    'workspaceScopeBag',
];`,
    );
    fs.writeFileSync(utilsPath, utils, 'utf8');
}

// Re-run rebuildScopeCall with updated bag list
core = fs.readFileSync(CORE_PATH, 'utf8');
core = rebuildScopeCall(core, []);
fs.writeFileSync(CORE_PATH, core, 'utf8');

const resolver = patchResolver(fs.readFileSync(RESOLVER, 'utf8'), NEW_BAGS);
fs.writeFileSync(RESOLVER, resolver, 'utf8');

console.log('Phase B slice 4 complete — direct scope keys remaining: 0');
