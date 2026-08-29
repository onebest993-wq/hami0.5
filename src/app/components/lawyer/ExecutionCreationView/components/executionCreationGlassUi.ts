/** أنماط زجاجية موحّدة — نموذج إنشاء التنفيذ (سطح مسطّح خفيف) */
export const ecg = {
    sheetBackdrop: 'fixed inset-0 z-[235] bg-[#05060D]/55',
    sheetPanel:
        'fixed inset-x-0 bottom-0 z-[236] flex flex-col rounded-t-2xl border-t border-white/[0.08] bg-[#0A0F1C]',
    sheetHeader: 'flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06]',
    sheetTitle: 'text-sm font-bold text-[#E6C673] flex-1 text-center tracking-wide',
    sheetClose:
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-end text-xs text-slate-400 hover:text-white text-right transition-colors touch-manipulation',
    sheetBody: 'flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-contain',
    sheetSectionTitle: 'text-[11px] font-semibold text-[#E6C673]/90 tracking-wide',
    sheetSectionBadge:
        'shrink-0 rounded-full border border-white/[0.08] bg-transparent px-2 py-0.5 text-[9px] font-medium text-slate-500',
    sheetBodyUnified:
        'flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 pb-2',
    sheetGroupedCard:
        'rounded-xl border border-white/[0.06] bg-transparent p-3 space-y-3',
    sheetSectionDivider: 'h-px w-full bg-white/[0.06]',
    sheetSectionHeader: 'flex flex-row-reverse items-center justify-between gap-2 px-0.5',
    sheetFooter:
        'flex-shrink-0 border-t border-white/[0.06] bg-[#0A0F1C] px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]',
    sheetScroll: 'flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 space-y-1.5',
    choiceRow: 'flex flex-row-reverse gap-2',
    choiceBtn:
        'flex-1 min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm font-semibold text-center transition-colors touch-manipulation',
    choiceBtnIdle:
        'text-slate-400 border-transparent bg-transparent hover:bg-white/[0.04] hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed',
    choiceBtnActive:
        'text-[#F5E6B8] border-[#E6C673]/28 bg-[#E6C673]/08',
    optionBtn:
        'w-full min-h-[44px] text-right rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors border touch-manipulation',
    optionBtnIdle:
        'text-slate-200 border-white/[0.06] bg-transparent hover:border-[#E6C673]/22 hover:bg-white/[0.04]',
    optionBtnActive:
        'text-[#F5E6B8] border-[#E6C673]/28 bg-[#E6C673]/08',
    multiPanel: 'space-y-3',
    multiHint: 'text-[11px] font-medium text-slate-400/95 leading-relaxed text-right px-1',
    multiList: 'space-y-2',
    multiItem:
        'flex flex-row-reverse items-center gap-3 min-h-[48px] rounded-xl px-3 py-2.5 cursor-pointer transition-colors duration-150 border',
    multiItemIdle: 'border-white/[0.06] bg-transparent hover:border-white/12 hover:bg-white/[0.04]',
    multiItemChecked:
        'border-[#E6C673]/28 bg-[#E6C673]/08',
    multiToggle:
        'relative flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border transition-colors duration-150',
    multiToggleIdle: 'border-white/20 bg-transparent',
    multiToggleChecked:
        'border-[#E6C673]/55 bg-[#E6C673]/28',
    saveBtn:
        'w-full min-h-[44px] rounded-xl border border-[#E6C673]/28 bg-[#E6C673]/10 py-3 text-sm font-bold text-[#F8EED0] hover:bg-[#E6C673]/16 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation',
    label: 'block text-xs font-semibold text-slate-400/95 mb-1.5 tracking-wide',
    labelGold: 'block text-xs font-semibold text-[#E6C673]/90 mb-1.5 tracking-wide',
    pickerBtn:
        'w-full min-h-[44px] rounded-xl border border-white/[0.06] bg-transparent px-3.5 py-3 outline-none transition-colors flex flex-row-reverse items-center justify-between gap-2 text-right text-slate-100 hover:border-[#E6C673]/25 hover:bg-white/[0.04] focus:border-[#E6C673]/35 touch-manipulation',
    pickerBtnDisabled: 'text-slate-500 cursor-not-allowed opacity-60 hover:border-white/[0.06] hover:bg-transparent',
    select:
        'w-full min-h-[44px] rounded-xl border border-white/[0.06] bg-transparent px-3.5 py-3 outline-none transition-colors text-slate-100 focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/12 hover:border-white/14 cursor-pointer',
    selectDisabled: 'text-slate-600 cursor-not-allowed opacity-50',
    card:
        'rounded-xl border border-white/[0.08] bg-[#0B1021] p-3 space-y-3',
    cardHeader: 'border-b border-white/[0.06] pb-2',
    cardTitle: 'text-[#E6C673] font-bold text-sm flex items-center gap-2',
    cardSubtitle: 'text-slate-400 text-[11px] mt-1 leading-relaxed',
    subCard: 'rounded-xl border border-white/[0.06] bg-transparent p-3 space-y-3',
    subCardTitle: 'text-slate-200 font-bold text-sm flex items-center gap-2',
    field:
        'w-full min-h-[44px] rounded-xl border border-white/[0.06] bg-transparent text-slate-100 px-3 py-2.5 outline-none transition-colors focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/12',
    moneyWrap:
        'flex min-h-[44px] items-center gap-2 w-full rounded-xl border border-white/[0.06] bg-transparent px-3 py-2.5 focus-within:border-[#E6C673]/40 focus-within:ring-1 focus-within:ring-[#E6C673]/12 transition-colors',
    moneyInput: 'flex-1 bg-transparent text-white outline-none font-mono text-base',
    chip:
        'rounded-full border border-[#E6C673]/22 bg-[#E6C673]/08 px-3 py-1 text-[10px] font-bold text-[#F0DFA8] hover:bg-[#E6C673]/14 transition-colors',
    badge:
        'inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/8 px-2.5 py-1 text-[10px] font-bold text-amber-200/95',
    resultCard:
        'rounded-xl border border-emerald-500/18 bg-emerald-950/10 p-3 space-y-3',
    aggregatePanel:
        'rounded-xl border border-[#E6C673]/20 bg-[#0B1021] p-3 space-y-3',
    aggregateTotalRow:
        'flex flex-row-reverse items-center justify-between gap-3 rounded-xl border border-[#E6C673]/22 bg-[#E6C673]/08 px-3.5 py-3',
    aggregateTotalLabel: 'text-sm font-bold text-[#F0DFA8]',
    aggregateTotalValue: 'text-lg font-black font-mono text-[#E6C673] tabular-nums tracking-wide',
    sectionWrap: 'w-full px-2 sm:px-3 py-2.5',
    sectionHeader: 'mb-2.5 pb-1.5 border-b border-white/[0.06]',
    sectionTitle: 'text-sm font-bold text-[#E6C673] tracking-wide leading-snug',
    partyGroup: 'rounded-xl border border-white/[0.06] bg-transparent',
    partyDivider: 'py-3',
    partyDividerLine: 'h-px w-full bg-white/[0.08]',
    addBtn:
        'w-full mt-2.5 min-h-[44px] text-[#E6C673] bg-transparent border border-[#E6C673]/20 hover:bg-[#E6C673]/08 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors touch-manipulation',
    hintPanel: 'mt-3 space-y-2 rounded-xl border border-[#E6C673]/18 bg-[#E6C673]/05 p-3 text-right',
    hintText: 'text-[10px] leading-relaxed text-[#F0DFA8]/85',
    modalShell: 'flex flex-col w-full h-screen bg-[#0A0F1C] overflow-hidden fixed inset-0 z-[241]',
    modalHeader:
        'flex-shrink-0 flex justify-between items-center w-full border-b border-white/[0.06] px-3 sm:px-4 hami-overlay-header-safe-pad pb-1 z-20',
    modalHeaderTitle: 'min-w-0 truncate text-right text-[13px] font-bold text-[#E6C673]',
    modalClose:
        'min-h-[44px] min-w-[44px] text-slate-400 hover:text-white p-2 rounded-lg transition-colors flex items-center gap-2 touch-manipulation',
    modalBody: 'flex-1 w-full overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden px-2 py-1.5',
    modalBodyStack: 'w-full space-y-2',
    fieldSm:
        'w-full min-h-[44px] rounded-xl border border-white/[0.06] bg-transparent text-slate-100 px-3 py-2 outline-none transition-colors focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/12 text-xs text-right',
    textarea:
        'w-full rounded-xl border border-white/[0.06] bg-transparent text-slate-100 px-3 py-2.5 outline-none transition-colors focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/12 resize-y',
    callout: 'rounded-xl border border-[#E6C673]/18 bg-[#E6C673]/05 p-3 space-y-3',
    calloutTitle: 'text-sm font-bold text-[#E6C673] flex items-center gap-2',
    calloutDanger: 'rounded-xl border border-rose-500/30 bg-rose-950/15 p-3 space-y-3',
    calloutDangerTitle: 'text-rose-300 font-bold text-base flex items-center gap-2',
    hintWarn: 'mt-2 rounded-lg border border-amber-400/22 bg-amber-500/6 p-2',
    hintSuccess: 'mt-2 rounded-lg border border-emerald-500/22 bg-emerald-500/6 p-2',
    hintDangerInline: 'text-xs text-rose-200/90 bg-rose-950/20 border border-rose-500/18 rounded-lg p-2',
    chipToggle:
        'min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold border transition-colors touch-manipulation',
    chipToggleActive: 'border-[#E6C673]/40 bg-[#E6C673]/10 text-[#E6C673]',
    chipToggleIdle: 'border-transparent bg-transparent text-slate-400 hover:bg-white/[0.04]',
    radioRow:
        'flex min-h-[44px] flex-row-reverse items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors touch-manipulation',
    radioRowActive: 'border-[#E6C673]/35 bg-[#E6C673]/08',
    radioRowIdle: 'border-white/[0.06] bg-transparent hover:border-white/12',
    modalBackdrop: 'fixed inset-0 z-[240] bg-black/55 flex items-center justify-center p-4',
    modalPanel:
        'rounded-xl border border-[#E6C673]/22 bg-[#0A0F1C] p-5 max-w-lg w-full',
    modalPanelDanger:
        'rounded-xl border border-rose-500/35 bg-[#0A0F1C] p-5 max-w-md w-full',
    modalDialogTitle: 'text-base font-bold text-[#E6C673] mb-2 flex items-center gap-2',
    modalTitle: 'text-base font-bold text-[#E6C673] mb-2 flex items-center gap-2',
    modalBtnPrimary:
        'flex-1 min-h-[44px] rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/12 py-3 text-sm font-bold text-[#F8EED0] hover:bg-[#E6C673]/18 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation',
    modalBtnGhost:
        'min-h-[44px] px-5 rounded-xl border border-white/[0.08] bg-transparent text-slate-200 font-bold py-3 hover:bg-white/[0.05] transition-colors touch-manipulation',
    optionRow: 'flex items-center gap-3 rounded-xl border border-white/[0.06] bg-transparent p-3',
} as const;
