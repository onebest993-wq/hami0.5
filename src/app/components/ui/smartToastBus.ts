import type React from 'react';
import { humanizeUserErrorMessage } from '@/app/utils/humanizeAppError';
export type ToastType = 'success' | 'error' | 'warning' | 'loading' | 'info';

export interface ToastOptions {
    message: string;
    type?: ToastType;
    icon?: React.ElementType | React.ReactNode;
    duration?: number;
    id?: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export interface ToastEvent extends ToastOptions {
    id: string;
    intent?: 'show' | 'dismiss';
}

const listeners = new Set<(toast: ToastEvent) => void>();

export function subscribeSmartToast(listener: (toast: ToastEvent) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function emitSmartToast(event: ToastEvent): void {
    listeners.forEach((listener) => listener(event));
}

/** واجهة Toast خفيفة — بدون motion (تُحمَّل مع المسار الحرج) */
export const SmartToast = {
    show: (message: string, options: Partial<ToastOptions> = {}) => {
        const type = options.type ?? 'info';
        const humanized =
            type === 'error' || type === 'warning'
                ? humanizeUserErrorMessage(message)
                : humanizeUserErrorMessage(message) ?? message.trim();
        if (!humanized) return '';
        const id = options.id || `${Date.now().toString()}${Math.random().toString()}`;
        const event: ToastEvent = {
            message: humanized,
            type,
            id,
            duration: 2500,
            intent: 'show',
            ...options,
        };
        emitSmartToast(event);
        return id;
    },
    success: (message: string, duration?: number) =>
        SmartToast.show(message, { type: 'success', ...(duration !== undefined ? { duration } : {}) }),
    error: (message: string, duration?: number) =>
        SmartToast.show(message, { type: 'error', ...(duration !== undefined ? { duration } : {}) }),
    warning: (message: string, duration?: number) =>
        SmartToast.show(message, { type: 'warning', ...(duration !== undefined ? { duration } : {}) }),
    loading: (message: string, duration?: number) =>
        SmartToast.show(message, {
            type: 'loading',
            ...(duration !== undefined ? { duration } : {}),
        }),    info: (message: string, duration?: number) =>
        SmartToast.show(message, { type: 'info', ...(duration !== undefined ? { duration } : {}) }),
    dismiss: (id: string) => {
        emitSmartToast({ id, message: '', intent: 'dismiss' });
    },
};
