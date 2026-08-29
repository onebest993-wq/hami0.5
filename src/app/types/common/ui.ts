/**
 * Shared UI component prop types.
 */

import React from 'react';
import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import type { CaseFile } from './caseFile';
import type { ExecutionArchiveFile } from './executionArchive';

export type { LucideIcon };

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface FileModalProps extends ModalProps {
    file: CaseFile | ExecutionArchiveFile | null;
    onSave: (data: CaseFile | ExecutionArchiveFile) => void;
}

export interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

/** للتوافق مع أيقونات SVG عامة؛ لـ lucide استخدم LucideIcon في الواجهات */
export interface IconProps {
    size?: number | string;
    className?: string;
    color?: string;
    strokeWidth?: number | string;
}

export interface AppHeaderProps {
    title: string;
    onBack?: () => void;
    rightIcon?: React.ReactNode;
}

export interface InputFieldProps {
    label?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: InputType;
    icon?: LucideIcon;
    className?: string;
    maxLength?: number;
    disabled?: boolean;
    required?: boolean;
}

export type InputType = 'text' | 'email' | 'password' | 'tel' | 'number' | 'date';

export interface MenuAction {
    id: string;
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    color?: string;
    disabled?: boolean;
}
