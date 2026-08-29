import fs from 'fs';

const lines = fs
  .readFileSync('src/app/components/lawyer/Modal_Seized_Assets_Manager.tsx', 'utf8')
  .split(/\r?\n/);

// Header: lines 281-289 (1-based) => indices 280-288
const headerJsx = lines.slice(280, 289).join('\n');
const header = `import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import { Lock } from '@/app/components/ui/icons/Lock';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
} from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';

export function SeizedAssetsModalHeader({ onClose }: { onClose: () => void }) {
    return (
${headerJsx}
    );
}
`;
fs.writeFileSync(
  'src/app/components/lawyer/seizedAssetsManager/SeizedAssetsModalHeader.tsx',
  header,
);

// Add form section: lines 291-352
const addFormJsx = lines.slice(290, 352).join('\n');
const addForm = `import React from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { EXEC_MODAL_TOUCH_TARGET } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import { seizedAssetTypes } from './seizedAssetsTypeCatalog';
import { SeizedAssetsTypeFields } from './SeizedAssetsTypeFields';

export function SeizedAssetsAddForm({
    showAddForm,
    onShowAddForm,
    newAssetType,
    setNewAssetType,
    formData,
    setFormData,
    onCancel,
    onAdd,
}: {
    showAddForm: boolean;
    onShowAddForm: () => void;
    newAssetType: string;
    setNewAssetType: (v: string) => void;
    formData: any;
    setFormData: (v: any) => void;
    onCancel: () => void;
    onAdd: () => void;
}) {
    return (
        <>
${!showAddForm ? '' : ''}
${addFormJsx.replace(
  '{renderFormFields()}',
  `<SeizedAssetsTypeFields
                                newAssetType={newAssetType}
                                formData={formData}
                                setFormData={setFormData}
                            />`,
)}
        </>
    );
}
`;
fs.writeFileSync(
  'src/app/components/lawyer/seizedAssetsManager/SeizedAssetsAddForm.tsx',
  addForm,
);

console.log('header+add written');
