import React from 'react';
import { createPortal } from 'react-dom';

import { SmartFileModal } from '@/app/components/lawyer/SmartFileModal';
import type { SmartFileModalProps } from '@/app/components/lawyer/smart-modal/smartFile/smartFileModalTypes';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';

type FileLike = SmartFileModalProps['file'] & { id?: unknown };

export function resolveFreshSmartFileModalFile(file: SmartFileModalProps['file']): SmartFileModalProps['file'] {
    const targetId = String((file as FileLike | undefined)?.id ?? '').trim();
    if (!targetId) return file;

    const storedFiles = loadLawsuitFilesRaw();
    const fresh = storedFiles.find((entry) => String((entry as { id?: unknown } | undefined)?.id ?? '').trim() === targetId);
    return (fresh as SmartFileModalProps['file'] | undefined) ?? file;
}

/** إضبارة الدعوى — portal مباشر على body لضمان استقبال النقرات */
export function SmartFileModalPortal(props: SmartFileModalProps) {
    const hydratedFile = resolveFreshSmartFileModalFile(props.file);
    const fileId = (hydratedFile as { id?: unknown } | undefined)?.id;
    const layer = <SmartFileModal key={`lawsuit-${String(fileId ?? 'unknown')}`} {...props} file={hydratedFile} />;
    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
