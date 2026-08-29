import React from 'react';

export function AdminWorkspaceEmptyState({ text }: { text: string }) {
    return (
        <div className="text-white/40 text-xs py-3 text-center border border-dashed border-white/10 rounded-lg bg-black/10">
            {text}
        </div>
    );
}
