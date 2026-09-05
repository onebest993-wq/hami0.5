import React from 'react';
import { LegalRichTextEditorCompactToolbar } from './LegalRichTextEditorCompactToolbar';
import type { LegalRichTextEditorToolbarActions } from './legalRichTextEditorToolbarTypes';

type LegalRichTextEditorToolbarProps = LegalRichTextEditorToolbarActions;

/**
 * شريط واحد لكل أسطح المحرّر (مسودة المستودع، تحرير البطاقة، ملاحظات الإضبارة).
 * النسخة الأفقية القابلة للتمرير هي مسار الموبايل؛ على الشاشات الواسعة تختفي أسهم التمرير إن لم تفض.
 */
export function LegalRichTextEditorToolbar(props: LegalRichTextEditorToolbarProps) {
    return <LegalRichTextEditorCompactToolbar {...props} />;
}
