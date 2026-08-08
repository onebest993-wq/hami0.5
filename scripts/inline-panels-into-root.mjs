import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');

function keysFromPropsType(propsFile) {
    const s = fs.readFileSync(path.join(ROOT, propsFile), 'utf8');
    return [...s.matchAll(/^\s+(\w+): unknown;/gm)].map((m) => m[1]);
}

function fixCorruption(s) {
    return s
        .replace(/disablep\.d/g, 'disabled')
        .replace(/preventDefaulp\.t/g, 'preventDefault')
        .replace(/<spap\.n/g, '<span')
        .replace(/<\/spap\.n>/g, '</span>')
        .replace(/hrep\.f=/g, 'href=')
        .replace(/\bip\.f\b/g, 'if')
        .replace(/caseData\?\.p\./g, 'caseData?.')
        .replace(/guaranteeDetails\.p\./g, 'guaranteeDetails.')
        .replace(/a\.p\.url/g, 'a.url')
        .replace(/onValueChange=\{\(v\) => p\.setNewFollowupDate\(p\.v\)\}/g, 'onValueChange={(v) => setNewFollowupDate(v)}')
        .replace(/const p\.f = e\.target\.files\?\.\[0\];\s*if \(p\.f\) p\.addAttachmentFile\(p\.f\);/g, 'const file = e.target.files?.[0];\n                                                if (file) addAttachmentFile(file);')
        .replace(/if \(e\.key === 'Enter'\) p\.addManualEvent\(\)/g, "if (e.key === 'Enter') addManualEvent()")
        .replace(/p\.n\.createdAt/g, 'n.createdAt')
        .replace(/htmlFor=\{attachmentInputId\}/g, 'htmlFor={attachmentInputId}')
        .replace(/\bisFinalized\b(?![\w.])/g, (m, off, str) => {
            const before = str.slice(Math.max(0, off - 3), off);
            if (before.endsWith('p.')) return m;
            return 'isFinalized';
        });
}

function extractPanelBody(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const start = raw.indexOf('return (');
    if (start < 0) throw new Error(`no return in ${filePath}`);
    let body = raw.slice(start + 'return ('.length);
    const portalIdx = body.indexOf('{confirmPortal}');
    if (portalIdx >= 0) body = body.slice(0, portalIdx);
    else {
        const lastClose = body.lastIndexOf('\n    );');
        if (lastClose < 0) throw new Error(`no close in ${filePath}`);
        body = body.slice(0, lastClose);
    }
    return fixCorruption(body.trimEnd());
}

function unprefixProps(code, propKeys) {
    const keySet = new Set(propKeys);
    return code.replace(/\bp\.([A-Za-z_$][\w$]*)/g, (_, name) => (keySet.has(name) ? name : `p.${name}`));
}

function stripAdminGarbage(body) {
    const markers = ['{confirmPortal}', '</>\n    );', '\n                    </motion.div>'];
    let cut = body.length;
    for (const m of markers) {
        const i = body.indexOf(m);
        if (i >= 0) cut = Math.min(cut, i);
    }
    return body.slice(0, cut).trimEnd();
}

function fixAdminUnprefixed(body) {
    return body
        .replace(/htmlFor=\{attachmentInputId\}/g, 'htmlFor={attachmentInputId}')
        .replace(/\{formatDateText\(/g, '{formatDateText(')
        .replace(/\{formatDateTimeText\(/g, '{formatDateTimeText(')
        .replace(/onValueChange=\{\(v\) => setNewFollowupDate\(v\)\}/g, 'onValueChange={(v) => setNewFollowupDate(v)}');
}

const lifeKeys = keysFromPropsType('layout/LifecyclePanelProps.ts');
const adminKeys = keysFromPropsType('layout/AdminWorkspacePanelProps.ts');

let lifeBody = unprefixProps(extractPanelBody(path.join(ROOT, 'layout/LifecyclePanel.tsx')), lifeKeys);
let adminBody = fixAdminUnprefixed(
    unprefixProps(stripAdminGarbage(extractPanelBody(path.join(ROOT, 'layout/AdminWorkspacePanel.tsx'))), adminKeys),
);

const rootPath = path.join(ROOT, 'ActiveOrderFileRoot.tsx');
let root = fs.readFileSync(rootPath, 'utf8');

const lifeStart = root.indexOf('<LifecyclePanel {...pickLifecyclePanelProps({');
const lifeEnd = lifeStart >= 0 ? root.indexOf('})} />', lifeStart) + 6 : -1;
const adminStart = root.indexOf('<AdminWorkspacePanel {...pickAdminWorkspacePanelProps({');
const adminEnd = adminStart >= 0 ? root.indexOf('})} />', adminStart) + 6 : -1;

if (lifeStart < 0 || adminStart < 0) {
    console.error('panel markers not found', { lifeStart, adminStart });
    process.exit(1);
}

const beforeLife = root.slice(0, lifeStart);
const between = root.slice(lifeEnd, adminStart);
const afterAdmin = root.slice(adminEnd);

root =
    beforeLife +
    lifeBody +
    '\n\n' +
    adminBody +
    `
                    </motion.div>
                </motion.div>
            </motion.div>
        </motion.div>
        {confirmPortal}
        </>
    );
};
`;

root = root.replace(
    /import \{ LifecyclePanel \}[^\n]*\nimport \{ AdminWorkspacePanel \}[^\n]*\nimport \{ pickLifecyclePanelProps[^\n]*\n/g,
    '',
);
root = root.replace(
    /import \{ pickLifecyclePanelProps, pickAdminWorkspacePanelProps \}[^\n]*\n/g,
    '',
);

fs.writeFileSync(rootPath, root);
console.log('inlined', { lifeLines: lifeBody.split('\n').length, adminLines: adminBody.split('\n').length, rootLines: root.split('\n').length });
