#!/usr/bin/env node
/**
 * `npm run deploy:check` — يُشغَّل قبل كلّ `vercel --prod`، ولا يُنشر إن سقط.
 *
 * يجمع الوقائع (git + سيرُ CI على الرأس من الواجهة العامّة) ويُسلّمها لحُكمٍ صرفٍ مُختبَر
 * (`scripts/lib/deployReadiness.mjs`). **لا يكتب شيئاً ولا ينشر شيئاً** — القرارُ والنشرُ بيد المالك.
 *
 * **وحدُّه المعلَن:** لا يمنع `vercel --prod` نفسَه — Vercel لا يرى هذا المستودع ما دام بلا Git مربوط — **بل يجعل
 * الطريقَ الصحيح أمراً واحداً يُسقط بأسبابه**. والطريقُ الصحيح شجرةٌ مستقلّة على `origin/main`:
 *
 *     git fetch origin main
 *     git worktree add ../hami-deploy origin/main
 *     (انسخ مجلّد .vercel إليها — مُتجاهَلٌ في git)
 *     cd ../hami-deploy && npm run deploy:check && vercel --prod
 */
import { execFileSync } from 'node:child_process';
import { evaluateDeployReadiness } from './lib/deployReadiness.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function originRepo() {
    const url = git('remote', 'get-url', 'origin');
    const m = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
    return m ? `${m[1]}/${m[2]}` : null;
}

async function workflowRunsFor(repo, sha) {
    if (!repo) return null;
    try {
        const r = await fetch(`https://api.github.com/repos/${repo}/actions/runs?head_sha=${sha}&per_page=50`, {
            headers: { 'User-Agent': 'hami-deploy-check', Accept: 'application/vnd.github+json' },
        });
        if (!r.ok) return null;
        const body = await r.json();
        return body.workflow_runs.map((run) => ({ name: run.name, status: run.status, conclusion: run.conclusion }));
    } catch {
        return null;
    }
}

try {
    git('fetch', 'origin', 'main', '--quiet');
} catch {
    /* بلا شبكة: يُحكم بما يُعرف محلّياً، ويسقط الشرطُ الثالث لتعذّر قراءة CI */
}

const headSha = git('rev-parse', 'HEAD');
let originMainSha = null;
try {
    originMainSha = git('rev-parse', '--verify', 'origin/main');
} catch {
    originMainSha = null;
}
const statusEntries = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
const workflowRuns = await workflowRunsFor(originRepo(), headSha);

const verdict = evaluateDeployReadiness({ headSha, originMainSha, statusEntries, workflowRuns });

console.log(`[deploy:check] HEAD ${headSha.slice(0, 8)} · origin/main ${originMainSha ? originMainSha.slice(0, 8) : '?'}`);
if (workflowRuns) for (const run of workflowRuns) console.log(`  CI  ${run.name}: ${run.status} · ${run.conclusion ?? '-'}`);
/*
 * `process.exitCode` لا `process.exit()`: الخروجُ الفوريّ بعد `fetch` على Windows يُسقط Node بتوكيد libuv
 * (`UV_HANDLE_CLOSING`، رمزُ خروجٍ سالب) — قِيس أوّلَ تشغيل. فالحكمُ يُكتب ويُترك المسارُ ينتهي وحده.
 */
if (verdict.ready) {
    console.log('[deploy:check] READY — الشجرةُ هي main بعينه، نظيفة، ونجح CI عليها. النشرُ قرارُ المالك.');
    process.exitCode = 0;
} else {
    console.error('[deploy:check] NOT READY — لا يُنشر:');
    for (const reason of verdict.reasons) console.error(`  - ${reason}`);
    process.exitCode = 1;
}
