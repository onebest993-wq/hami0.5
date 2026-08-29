import fs from 'fs';

const src = fs.readFileSync('src/app/components/lawyer/Modal_Seized_Assets_Manager.tsx', 'utf8');

// Extract renderFormFields switch body content by writing SeizedAssetsTypeFields from known lines
const lines = src.split(/\r?\n/);

const typeFields = `import React from 'react';

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
${lines.slice(167, 271).join('\n')}
    }
}
`;

fs.writeFileSync(
  'src/app/components/lawyer/seizedAssetsManager/SeizedAssetsTypeFields.tsx',
  typeFields,
);
console.log('type fields', typeFields.split('\\n').length);
