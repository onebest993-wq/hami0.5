import React from 'react';

export function evictionProcedureIcon(node: React.ReactNode): React.ReactNode {
    return (
        <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 shrink-0">
            {node}
        </span>
    );
}
