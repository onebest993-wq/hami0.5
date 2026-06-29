import React from 'react';
import { SmartFileModalContent } from './smart-modal/SmartFileModalContent';
import type { SmartFileModalProps } from './smart-modal';

export type { SmartFileModalProps } from './smart-modal';

export const SmartFileModal = (props: SmartFileModalProps) => {
    const fileId = (props.file as { id?: unknown } | undefined)?.id;
    return <SmartFileModalContent key={String(fileId ?? 'unknown')} {...props} />;
};
