import React from 'react';
import type { TextStyleScope } from './patchTextBlockStyle';

const SCOPE_OPTIONS = [
    ['all', 'كامل النص'],
    ['line', 'سطر'],
    ['phrase', 'مقطع/كلمة'],
] as const;

type TextBlockStyleScopeTabsProps = {
    scope: TextStyleScope;
    onScopeChange: (scope: TextStyleScope) => void;
    onPhraseRangeChange: (range: { start: number; end: number } | null) => void;
};

export function TextBlockStyleScopeTabs({
    scope,
    onScopeChange,
    onPhraseRangeChange,
}: TextBlockStyleScopeTabsProps) {
    return (
        <div>
            <p className="profile-studio-field-label">نطاق التنسيق</p>
            <div className="profile-studio-scope-tabs">
                {SCOPE_OPTIONS.map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        data-active={scope === id ? 'true' : 'false'}
                        data-testid={`text-style-scope-${id}`}
                        className="profile-studio-scope-tab min-h-[44px]"
                        onClick={() => {
                            onScopeChange(id);
                            onPhraseRangeChange(null);
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}
