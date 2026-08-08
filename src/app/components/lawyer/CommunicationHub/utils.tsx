import type { MessageAction } from '@/app/types/common';
import type { RetrievedChunk } from './types';

export function normalizeRetrievedChunks(raw: unknown): RetrievedChunk[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const row = item as Record<string, unknown>;
            const lawName = typeof row.law_name === 'string' ? row.law_name : null;
            const articleNumber = typeof row.article_number === 'string' ? row.article_number : null;
            const content = typeof row.content === 'string' ? row.content : null;
            if (!content || !content.trim()) return null;
            return {
                law_name: lawName,
                article_number: articleNumber,
                content: content.trim(),
            };
        })
        .filter((x): x is RetrievedChunk => x !== null);
}

export function normalizeAiActions(raw: unknown): MessageAction[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item, i) => {
            if (item && typeof item === 'object' && 'label' in item) {
                const o = item as Record<string, unknown>;
                const label = String(o.label ?? '');
                const id = typeof o.id === 'string' ? o.id : `action-${i}`;
                const action = typeof o.action === 'string' ? o.action : 'doc';
                return { id, label, action };
            }
            return null;
        })
        .filter((x): x is MessageAction => x !== null);
}

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            if (base64 == null) {
                reject(new Error('تعذّر قراءة الملف'));
                return;
            }
            resolve(base64);
        };
        reader.onerror = (error) => reject(error instanceof Error ? error : new Error(String(error)));
    });
}

import React from 'react';

export const renderText = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="text-[#E6C673] font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};
