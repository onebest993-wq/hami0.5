import React from 'react';
import { File } from '@/app/components/ui/icons/File';
import { FileText } from '@/app/components/ui/icons/FileText';
import { ImageIcon } from '@/app/components/ui/icons/ImageIcon';
import { Music2 } from '@/app/components/ui/icons/Music2';
import type { VaultMediaKind } from '@/app/services/vault/vaultDocUtils';
import { vaultMediaKindLabel } from '@/app/services/vault/vaultDocUtils';
import {
    REPO_BADGE_AUDIO,
    REPO_BADGE_FILE,
    REPO_BADGE_GOLD,
    REPO_BADGE_IMAGE,
    REPO_BADGE_PDF,
} from './smartRepositoryTheme';

function badgeClassForKind(kind: VaultMediaKind | 'note' | 'attachment'): string {
    switch (kind) {
        case 'image':
            return REPO_BADGE_IMAGE;
        case 'pdf':
            return REPO_BADGE_PDF;
        case 'audio':
            return REPO_BADGE_AUDIO;
        case 'note':
            return REPO_BADGE_GOLD;
        default:
            return REPO_BADGE_FILE;
    }
}

function BadgeIcon({ kind }: { kind: VaultMediaKind | 'note' | 'attachment' }) {
    const props = { size: 11 as const, strokeWidth: 2.4 as const, 'aria-hidden': true as const };
    switch (kind) {
        case 'image':
            return <ImageIcon {...props} />;
        case 'pdf':
            return <FileText {...props} />;
        case 'audio':
            return <Music2 {...props} />;
        case 'note':
            return <FileText {...props} />;
        default:
            return <File {...props} />;
    }
}

export function RepositoryMediaKindBadge({
    kind,
    label,
}: {
    kind: VaultMediaKind | 'note' | 'attachment';
    label?: string;
}) {
    const text =
        label ??
        (kind === 'note'
            ? 'مسودة'
            : kind === 'attachment'
              ? 'مرفق'
              : vaultMediaKindLabel(kind));

    return (
        <span className={badgeClassForKind(kind)}>
            <BadgeIcon kind={kind} />
            <span>{text}</span>
        </span>
    );
}
