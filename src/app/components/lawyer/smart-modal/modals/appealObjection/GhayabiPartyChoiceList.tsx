import React from 'react';

type GhayabiPartyRow = { partyId: string; name: string };

export function GhayabiPartyChoiceList({
    parties,
    value = '',
    values,
    onChange,
    label,
    labelClassName,
    required = false,
    requiredClassName,
    showWhenSingle = false,
    multiple = false,
    getOptionTestId,
}: {
    parties: GhayabiPartyRow[];
    value?: string;
    values?: string[];
    onChange: (partyId: string) => void;
    label: string;
    labelClassName: string;
    required?: boolean;
    requiredClassName?: string;
    showWhenSingle?: boolean;
    multiple?: boolean;
    getOptionTestId?: (partyId: string) => string;
}) {
    if (parties.length === 0) return null;
    if (parties.length <= 1 && !showWhenSingle) return null;

    const selectedIds = multiple ? new Set(values ?? []) : null;

    return (
        <div>
            <label className={labelClassName}>
                {label}
                {required ? <span className={requiredClassName}> *</span> : null}
            </label>
            <div
                className="flex flex-col gap-2"
                role={multiple ? 'group' : undefined}
                aria-multiselectable={multiple || undefined}
            >
                {parties.map((party) => {
                    const selected = multiple
                        ? Boolean(selectedIds?.has(party.partyId))
                        : value === party.partyId;
                    return (
                        <button
                            key={party.partyId}
                            type="button"
                            aria-pressed={selected}
                            data-testid={getOptionTestId?.(party.partyId)}
                            onClick={() => onChange(party.partyId)}
                            className={`w-full min-h-[44px] rounded-xl border p-3 text-sm text-right touch-manipulation transition-colors ${
                                selected
                                    ? 'bg-[#E6C673]/10 border-[#E6C673]/28 text-[#E6C673] font-semibold'
                                    : 'bg-[#0A0F1C] border-white/[0.08] text-white'
                            }`}
                        >
                            {party.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
