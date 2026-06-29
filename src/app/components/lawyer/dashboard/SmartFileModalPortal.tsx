import React from 'react';
import { createPortal } from 'react-dom';

import { SmartFileModal } from '@/app/components/lawyer/SmartFileModal';
import type { SmartFileModalProps } from '@/app/components/lawyer/smart-modal/smartFile/smartFileModalTypes';

/** إضبارة الدعوى — تحميل مباشر (بدون lazy) لفتح فوري */
export function SmartFileModalPortal(props: SmartFileModalProps) {
    const fileId = (props.file as { id?: unknown } | undefined)?.id;
    const layer = <SmartFileModal key={`lawsuit-${String(fileId ?? 'unknown')}`} {...props} />;
    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
