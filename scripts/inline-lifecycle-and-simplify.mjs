import fs from 'fs';
import path from 'path';

const root = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');
const rootPath = path.join(root, 'ActiveOrderFileRoot.tsx');
const lifePath = path.join(root, 'layout/LifecyclePanel.tsx');

let rootSrc = fs.readFileSync(rootPath, 'utf8');
let lifeSrc = fs.readFileSync(lifePath, 'utf8');

const jsxStart = lifeSrc.indexOf('return (\n        <>');
const jsxEnd = lifeSrc.lastIndexOf('</>');
if (jsxStart < 0 || jsxEnd < 0) {
    console.error('lifecycle jsx bounds not found');
    process.exit(1);
}
const lifecycleJsx = lifeSrc.slice(jsxStart + 'return (\n        <>\n'.length, jsxEnd).trim();

if (!rootSrc.includes('<LifecyclePanel />')) {
    console.error('LifecyclePanel tag missing');
    process.exit(1);
}
rootSrc = rootSrc.replace('<LifecyclePanel />', lifecycleJsx);

rootSrc = rootSrc.replace(/import \{ LifecyclePanel \} from '\.\/layout\/LifecyclePanel';\n/, '');

// Remove model block
const modelStart = rootSrc.indexOf('    const model = useStableModelRef({');
const confirmPortal = rootSrc.indexOf('    const confirmPortal = (', modelStart);
if (modelStart >= 0 && confirmPortal > modelStart) {
    rootSrc = rootSrc.slice(0, modelStart) + rootSrc.slice(confirmPortal);
}

rootSrc = rootSrc.replace(
    '    return (\n        <ActiveOrderFileContext.Provider value={model}>\n        <>',
    '    return (\n        <>',
);
rootSrc = rootSrc.replace(
    '{confirmPortal}\n        </>\n        </ActiveOrderFileContext.Provider>',
    '{confirmPortal}\n        </>',
);

rootSrc = rootSrc.replace(
    "import { ActiveOrderFileContext } from './context/ActiveOrderFileContext';\nimport { useStableModelRef } from './hooks/useStableModelRef';\n\n",
    '',
);

fs.writeFileSync(rootPath, rootSrc);
fs.unlinkSync(lifePath);
console.log('inlined lifecycle, removed context wrapper');
