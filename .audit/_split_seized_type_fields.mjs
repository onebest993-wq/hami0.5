import fs from 'fs';

const lines = fs
  .readFileSync('src/app/components/lawyer/Modal_Seized_Assets_Manager.tsx', 'utf8')
  .split(/\r?\n/);

const cases = lines.slice(167, 269).join('\n');
const out = `import React from 'react';

export function SeizedAssetsTypeFields({
    newAssetType,
    formData,
    setFormData,
}: {
    newAssetType: string;
    formData: any;
    setFormData: (v: any) => void;
}) {
    switch (newAssetType) {
${cases}
    }
}
`;
fs.writeFileSync(
  'src/app/components/lawyer/seizedAssetsManager/SeizedAssetsTypeFields.tsx',
  out,
);
console.log(lines[167]);
console.log('ok', out.split(/\n/).length);
