import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const budgetPath = path.join(__dirname, 'perf-budget.json');

const DEFAULT_BUDGET = {
    limits: {
        entryRawKb: 120,
        entryGzipKb: 45,
        criticalPathGzipKb: 320,
        anyChunkRawKb: 520,
        mainCssGzipKb: 85,
    },
    targets: {
        entryGzipKb: 38,
        criticalPathGzipKb: 200,
        anyChunkRawKb: 280,
    },
    chunkRegression: {
        maxPercentIncrease: 5,
        watchPrefixes: [],
    },
};

export function loadPerfBudget() {
    if (!fs.existsSync(budgetPath)) return DEFAULT_BUDGET;
    try {
        const raw = JSON.parse(fs.readFileSync(budgetPath, 'utf8'));
        return {
            ...DEFAULT_BUDGET,
            ...raw,
            limits: { ...DEFAULT_BUDGET.limits, ...raw.limits },
            targets: { ...DEFAULT_BUDGET.targets, ...raw.targets },
            chunkRegression: { ...DEFAULT_BUDGET.chunkRegression, ...raw.chunkRegression },
            namedChunkMaxRawKb: {
                ...(DEFAULT_BUDGET.namedChunkMaxRawKb || {}),
                ...(raw.namedChunkMaxRawKb || {}),
            },
        };
    } catch {
        return DEFAULT_BUDGET;
    }
}
