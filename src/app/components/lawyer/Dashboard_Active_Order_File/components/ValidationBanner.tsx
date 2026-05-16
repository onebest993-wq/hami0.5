import React from 'react';

export function ValidationBanner({ text }: { text: string }) {
    return (
        <div className="px-4 py-3 rounded-lg border border-red-500/25 bg-red-500/10 text-red-100 text-sm font-bold">
            {text}
        </div>
    );
}
