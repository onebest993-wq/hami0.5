export type LegalRichTextEditorToolbarActions = {
    activeBold: boolean;
    activeForeColor: string | null;
    activeHighlightColor: string | null;
    onToggleBold: () => void;
    onFontSize: (value: string) => void;
    onToggleForeColor: (color: string) => void;
    onApplyHighlightColor: (color: string) => void;
    onClearHighlight: () => void;
};
