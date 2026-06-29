import { execSync } from 'child_process';
import fs from 'fs';

const rel = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const gitText = execSync(`git show HEAD:${rel}`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const curText = fs.readFileSync(rel, 'utf8');

const stripStrings = (line) =>
    line
        .replace(/`(?:\\.|[^`\\])*`/g, '``')
        .replace(/'(?:\\.|[^'\\])*'/g, "''")
        .replace(/"(?:\\.|[^"\\])*"/g, '""');

const gitByNorm = new Map();
for (const line of gitText.split(/\r?\n/)) {
    const norm = stripStrings(line).trim();
    if (norm) gitByNorm.set(norm, line);
}

const out = [];
let fixed = 0;
let unfixed = 0;
for (const line of curText.split(/\r?\n/)) {
    const bad = /(?:Ø|ðŸ|â€|Ã.|�|\?{3,})/.test(line);
    if (!bad) {
        out.push(line);
        continue;
    }
    const norm = stripStrings(line).trim();
    const fromGit = gitByNorm.get(norm);
    if (fromGit) {
        out.push(fromGit);
        fixed++;
    } else {
        out.push(line);
        unfixed++;
    }
}

fs.writeFileSync(rel, out.join('\n'), 'utf8');
console.log(JSON.stringify({ fixed, unfixed }));
