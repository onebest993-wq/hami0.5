import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');

function fixPanelContent(s) {
    return s
        .replace(/<dip\.v/g, '<div')
        .replace(/<\/dip\.v>/g, '</div>')
        .replace(/<motion\.dip\.v/g, '<motion.div')
        .replace(/<\/motion\.dip\.v>/g, '</motion.div>')
        .replace(/buttop\.n/g, 'button')
        .replace(/<\/buttop\.n>/g, '</button>')
        .replace(/mip\.n=/g, 'min=')
        .replace(/p\.min=/g, 'min=')
        .replace(/p\.max=/g, 'max=')
        .replace(/p\.key=/g, 'key=')
        .replace(/p\.type=/g, 'type=')
        .replace(/p\.ref=/g, 'ref=')
        .replace(/p\.id=/g, 'id=')
        .replace(/htmlFor={p\./g, 'htmlFor={')
        .replace(/onValueChange=\{\(p\.v\) =>/g, 'onValueChange={(v) =>')
        .replace(/onChange=\{\(p\.e\) =>/g, 'onChange={(e) =>')
        .replace(/onClick=\{\(p\.e\) =>/g, 'onClick={(e) =>')
        .replace(/onKeyDown=\{\(p\.e\) =>/g, 'onKeyDown={(e) =>')
        .replace(/\.map\(\(p\.f\)/g, '.map((f)')
        .replace(/\.map\(\(p\.n\)/g, '.map((n)')
        .replace(/\.map\(\(p\.h\)/g, '.map((h)')
        .replace(/\.map\(\(p\.a\)/g, '.map((a)')
        .replace(/\.map\(\(p\.ev\)/g, '.map((ev)')
        .replace(/\.map\(\(p\.group\)/g, '.map((group)')
        .replace(/\.map\(\(p\.t\)/g, '.map((t)')
        .replace(/\.map\(\(p\.p\)/g, '.map((p)')
        .replace(/\.map\(\(p\.ep\)/g, '.map((ep)')
        .replace(/\.map\(\(p\.item\)/g, '.map((item)')
        .replace(/\.map\(\(p\.step\)/g, '.map((step)')
        .replace(/\(p\.e\)\.stopPropagation/g, '(e).stopPropagation')
        .replace(/\(p\.e\)\.preventDefault/g, '(e).preventDefault')
        .replace(/p\.e\.target/g, 'e.target')
        .replace(/p\.e\.currentTarget/g, 'e.currentTarget')
        .replace(/p\.e\.key/g, 'e.key')
        .replace(/key={p\.f\.id}/g, 'key={f.id}')
        .replace(/key={p\.n\.id}/g, 'key={n.id}')
        .replace(/key={p\.h\.id}/g, 'key={h.id}')
        .replace(/key={p\.a\.id}/g, 'key={a.id}')
        .replace(/key={p\.ev\.id}/g, 'key={ev.id}');
}

for (const file of ['layout/LifecyclePanel.tsx', 'layout/AdminWorkspacePanel.tsx']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    const fixed = fixPanelContent(fs.readFileSync(p, 'utf8'));
    fs.writeFileSync(p, fixed);
    console.log('fixed', file);
}

function keysFromPropsType(propsFile) {
    const s = fs.readFileSync(path.join(ROOT, propsFile), 'utf8');
    const keys = [];
    for (const m of s.matchAll(/^\s+(\w+): unknown;/gm)) keys.push(m[1]);
    return keys;
}

function rebuildRootInvocations() {
    const rootPath = path.join(ROOT, 'ActiveOrderFileRoot.tsx');
    let s = fs.readFileSync(rootPath, 'utf8');

    const lifeKeys = keysFromPropsType('LifecyclePanelProps.ts').filter(
        (k) => !['t', 'v', 'y', 'f', 'n', 'e', 'h', 'a', 'ev', 'group', 'meta', 'ep', 'item', 'step', 'p', 's', 'i', 'd', 'dd', 'mm', 'yy', 'clean', 'start', 'end', 'dec', 'who', 'when', 'defer', 'skip', 'base', 'detail', 'details', 'candidates', 'amount', 'adjournReason', 'url', 'text', 'title', 'target', 'stage', 'dayKey', 'dayLabel', 'deadline', 'deadlineText', 'yyyy', 'ymd', 'baseNotes', 'archivedAt', 'archivedReason', 'applyCaseRecord'].includes(k),
    );
    const adminKeys = keysFromPropsType('AdminWorkspacePanelProps.ts').filter(
        (k) => !['t', 'v', 'y', 'f', 'n', 'e', 'ev', 'group', 'meta', 'a', 'start', 'target', 'text', 'title', 'url', 'dayKey', 'dayLabel'].includes(k),
    );

    const lifeBlock = `                        <LifecyclePanel {...pickLifecyclePanelProps({\n${lifeKeys.map((k) => `                            ${k},`).join('\n')}\n                        })} />`;

    const adminBlock = `                        <AdminWorkspacePanel {...pickAdminWorkspacePanelProps({\n${adminKeys.map((k) => `                            ${k},`).join('\n')}\n                        })} />`;

    const lifeStart = s.indexOf('<LifecyclePanel {...pickLifecyclePanelProps({');
    const lifeEnd = s.indexOf('})} />', lifeStart) + 6;
    if (lifeStart >= 0) s = s.slice(0, lifeStart) + lifeBlock + s.slice(lifeEnd);

    const adminStart = s.indexOf('<AdminWorkspacePanel {...pickAdminWorkspacePanelProps({');
    const adminEnd = s.indexOf('})} />', adminStart) + 6;
    if (adminStart >= 0) s = s.slice(0, adminStart) + adminBlock + s.slice(adminEnd);

    if (!s.includes('{confirmPortal}')) {
        s = s.trimEnd() + `
                    </div>
                </div>
            </div>
        </div>
        {confirmPortal}
        </>
    );
};
`;
    }

    if (!s.includes("pickLifecyclePanelProps")) {
        s = s.replace(
            "import { ConfirmDialogPortal } from './components/ConfirmDialogPortal';",
            `import { ConfirmDialogPortal } from './components/ConfirmDialogPortal';
import { LifecyclePanel } from './layout/LifecyclePanel';
import { AdminWorkspacePanel } from './layout/AdminWorkspacePanel';
import { pickLifecyclePanelProps, pickAdminWorkspacePanelProps } from './pickPanelProps';`,
        );
    }

    fs.writeFileSync(rootPath, s);
    console.log('root rebuilt', { lifeKeys: lifeKeys.length, adminKeys: adminKeys.length });
}

rebuildRootInvocations();
