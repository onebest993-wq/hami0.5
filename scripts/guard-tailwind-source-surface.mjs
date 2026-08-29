#!/usr/bin/env node
/**
 * يمنع عودة المسح العريض لـ lawyer في tailwind.css (تكرار ~500KB مع tailwind-features).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tailwindPath = resolve(root, 'src/styles/tailwind.css');
const featuresPath = resolve(root, 'src/styles/tailwind-features.css');
const workspacePath = resolve(root, 'src/styles/tailwind-features-workspace.css');
const dossiersPath = resolve(root, 'src/styles/tailwind-features-dossiers.css');
const adminPath = resolve(root, 'src/styles/tailwind-features-admin.css');

const tailwind = readFileSync(tailwindPath, 'utf8');
const featuresCombined = readFileSync(featuresPath, 'utf8');
const features = [
    readFileSync(workspacePath, 'utf8'),
    readFileSync(dossiersPath, 'utf8'),
    readFileSync(adminPath, 'utf8'),
].join('\n');

const fail = (msg) => {
    console.error(`[guard-tailwind-source] FAIL: ${msg}`);
    process.exit(1);
};

const heavyDirs = [
    'ExecutionDashboard',
    'criminal-system',
    'smart-modal',
    'SmartRepository',
    'CommunityScreen',
    'dossier-notes',
    'execution',
];

const broadLawyerColdScan = /@source\s+'\.\.\/app\/components\/lawyer\/\*\*\//.test(tailwind);
if (broadLawyerColdScan) {
    for (const dir of heavyDirs) {
        const escaped = dir.replace(/-/g, '\\-');
        const coldExclude = new RegExp(`@source not '\\.\\./app/components/lawyer/${escaped}/\\*\\*'`);
        if (!coldExclude.test(tailwind)) {
            fail(
                `broad lawyer @source in tailwind.css requires @source not '../app/components/lawyer/${dir}/**'`,
            );
        }
    }
}

for (const dir of heavyDirs) {
    const escaped = dir.replace(/-/g, '\\-');
    const coldPositive = new RegExp(`^@source\\s+'\\.\\./app/components/lawyer/${escaped}/\\*\\*'`, 'm');
    if (coldPositive.test(tailwind)) {
        fail(`heavy lawyer/${dir} must not be positively @source'd in tailwind.css`);
    }
    const featureInclude = new RegExp(`@source\\s+'\\.\\./app/components/lawyer/${escaped}/\\*\\*'`);
    if (!featureInclude.test(features)) {
        fail(`tailwind-features-{workspace|dossiers|admin}.css must @source lawyer/${dir}/**`);
    }
}

if (!featuresCombined.includes("tailwind-features-workspace.css")) {
    fail('tailwind-features.css must import the workspace split');
}
if (!featuresCombined.includes("tailwind-features-dossiers.css")) {
    fail('tailwind-features.css must import the dossiers split');
}
if (dossiersHasAdminLeak()) {
    fail('tailwind-features-dossiers.css must not scan AdminDashboard/admin');
}

function dossiersHasAdminLeak() {
    const dossiers = readFileSync(dossiersPath, 'utf8');
    return /AdminDashboard|components\/admin\/\*\*/.test(dossiers);
}

console.log('[guard-tailwind-source] PASS');
