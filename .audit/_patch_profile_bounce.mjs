import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, fn) {
    const raw = readFileSync(path, 'utf8');
    const nl = raw.includes('\r\n') ? '\r\n' : '\n';
    const normalized = raw.replace(/\r\n/g, '\n');
    const next = fn(normalized);
    if (next === normalized) throw new Error('no change: ' + path);
    writeFileSync(path, next.replace(/\n/g, nl));
    console.log('ok', path);
}

patch('src/app/runtime/profileInstantPaint.ts', (s) => {
    let out = s.replace(/\nfunction resetProfileSurfaceScroll\(\): void \{[\s\S]*?\n\}\n/, '\n');
    out = out.replace(/\n    void surface\.offsetHeight;\n/g, '\n');
    out = out.replace(
        /        applySurfacePaint\(surface, true\);\n        resetProfileSurfaceScroll\(\);\n        removeProfileInstantBridge\(\);/,
        '        applySurfacePaint(surface, true);\n        removeProfileInstantBridge();',
    );
    if (out.includes('resetProfileSurfaceScroll')) throw new Error('reset still present');
    return out;
});

patch('src/app/hooks/lawyerDashboard/profile/profileShellOpenFlow.ts', (s) => {
    const next = s.replace(
        /            if \(!surfaceReady\) \{\n                flushSync\(\(\) => \{\n                    params\.setProfileHostMounted\(true\);\n                \}\);\n                revealProfileWarmShell\(\);\n            \}\n\n            applyProfileOpenReactState\(params\);\n            revealProfileWarmShell\(\);/,
        `            if (!surfaceReady) {
                flushSync(() => {
                    params.setProfileHostMounted(true);
                });
                revealProfileWarmShell();
            }

            applyProfileOpenReactState(params);
            /* لا reveal ثاني — السطح ثابت؛ إعادة الطلاء تسبب اهتزاز صعود/نزول */`,
    );
    if (next === s) throw new Error('open flow unchanged');
    return next;
});

patch('src/app/components/lawyer/RoyalLawyerProfile/profilePageMaterialFx.css', (s) => {
    const from = `[data-lawyer-profile-root][data-profile-reduce-motion='true'] [data-profile-portrait-float],
[data-lawyer-profile-root][data-profile-page-hidden='true'] [data-profile-portrait-float] {
    animation: none !important;
    transform: none !important;
}`;
    const to = `[data-lawyer-profile-root][data-profile-reduce-motion='true'] [data-profile-portrait-float] {
    animation: none !important;
    transform: none !important;
}

[data-lawyer-profile-root][data-profile-page-hidden='true'] [data-profile-portrait-float] {
    /* إيقاف فقط — بلا transform:none حتى لا يقفز البورتريه عند كشف التبويب */
    animation-play-state: paused !important;
}`;
    if (!s.includes(from)) throw new Error('material css pattern missing');
    return s.replace(from, to);
});
