import React from 'react';
import type { AccountLegalDocument } from './accountLegalContent';

export function AccountLegalDocumentBody({ doc }: { doc: AccountLegalDocument }) {
    return (
        <div
            className="hami-settings-sheet-body flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain scrollbar-hide py-4 touch-pan-y"
            data-testid="account-legal-document-body"
        >
            <div className="space-y-5 max-w-3xl mx-auto">
                {doc.sections.map((section) => (
                    <section key={section.title} className="space-y-2">
                        <h3 className="text-sm font-bold text-[#E6C673] leading-relaxed">{section.title}</h3>
                        {section.paragraphs?.map((paragraph) => (
                            <p key={paragraph} className="text-xs text-white/70 leading-relaxed">
                                {paragraph}
                            </p>
                        ))}
                        {section.bullets?.length ? (
                            <ul className="space-y-2 pr-1">
                                {section.bullets.map((bullet) => (
                                    <li
                                        key={bullet}
                                        className="text-xs text-white/65 leading-relaxed list-disc list-inside marker:text-[#E6C673]/70"
                                    >
                                        {bullet}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </section>
                ))}
            </div>
        </div>
    );
}
