/** أنماط زجاجية موحّدة — نموذج إنشاء التنفيذ */
export const ecg = {
    sheetBackdrop: 'fixed inset-0 z-[235] bg-[#05060D]/75 backdrop-blur-md',
    sheetPanel:
        'fixed inset-x-0 bottom-0 z-[236] flex flex-col rounded-t-3xl border-t border-[#E6C673]/25 bg-[#0A0F1C]/88 backdrop-blur-2xl shadow-[0_-16px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/5',
    sheetHeader: 'flex-shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/8',
    sheetTitle: 'text-sm font-bold text-[#E6C673] flex-1 text-center tracking-wide',
    sheetClose: 'text-xs text-slate-400 hover:text-white min-w-[3rem] text-right transition-colors',
    sheetBody: 'flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-contain',
    sheetSectionTitle: 'px-4 pt-2 pb-2 text-[10px] font-bold text-[#E6C673]/75 tracking-wide',
    sheetExclusiveBlock: 'flex-shrink-0 px-4 pb-4 border-b border-[#E6C673]/20 space-y-2',
    sheetScroll: 'flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 space-y-1.5',
    choiceRow: 'flex flex-row-reverse gap-2',
    choiceBtn:
        'flex-1 rounded-xl border px-4 py-3 text-sm font-semibold text-center transition-all',
    choiceBtnIdle:
        'text-slate-300 border-white/10 bg-white/[0.03] hover:border-[#E6C673]/25 hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed',
    choiceBtnActive:
        'text-[#F5E6B8] border-[#E6C673]/45 bg-gradient-to-b from-[#E6C673]/16 to-[#E6C673]/6 shadow-[0_0_16px_-6px_rgba(230,198,115,0.45)]',
    optionBtn:
        'w-full text-right rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all border backdrop-blur-sm',
    optionBtnIdle:
        'text-slate-200 border-white/8 bg-white/[0.03] hover:border-[#E6C673]/25 hover:bg-white/[0.06]',
    optionBtnActive:
        'text-[#F5E6B8] border-[#E6C673]/40 bg-gradient-to-l from-[#E6C673]/14 to-transparent shadow-[0_0_20px_-8px_rgba(230,198,115,0.5)]',
    multiPanel:
        'flex-shrink-0 border-t-2 border-[#E6C673]/25 bg-[#05060D]/92 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3',
    multiHint: 'text-[11px] font-medium text-slate-400/95 leading-relaxed text-right px-1',
    multiList: 'space-y-2',
    multiItem:
        'flex flex-row-reverse items-center gap-3 min-h-[48px] rounded-2xl px-3.5 py-3 cursor-pointer transition-all duration-200 border',
    multiItemIdle: 'border-white/8 bg-white/[0.02] hover:border-white/14 hover:bg-white/[0.05]',
    multiItemChecked:
        'border-[#E6C673]/40 bg-gradient-to-l from-[#E6C673]/14 via-[#E6C673]/6 to-transparent shadow-[0_0_20px_-10px_rgba(230,198,115,0.45)]',
    multiToggle:
        'relative flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border transition-all duration-200',
    multiToggleIdle: 'border-white/25 bg-[#0A0F1C]/60 backdrop-blur-sm',
    multiToggleChecked:
        'border-[#E6C673]/70 bg-gradient-to-br from-[#E6C673]/50 to-[#B8942E]/30 shadow-[0_0_14px_-4px_rgba(230,198,115,0.7)]',
    saveBtn:
        'w-full rounded-2xl border border-[#E6C673]/45 bg-gradient-to-l from-[#E6C673]/22 to-[#E6C673]/8 py-3.5 text-sm font-bold text-[#F8EED0] hover:from-[#E6C673]/30 hover:to-[#E6C673]/12 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_24px_-10px_rgba(230,198,115,0.55)]',
    label: 'block text-xs font-bold text-slate-400/95 mb-2 tracking-wide',
    labelGold: 'block text-xs font-bold text-[#E6C673]/90 mb-2 tracking-wide',
    pickerBtn:
        'w-full rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md px-4 py-3.5 outline-none transition-all flex flex-row-reverse items-center justify-between gap-2 text-right text-slate-100 hover:border-[#E6C673]/30 hover:bg-white/[0.06] focus:border-[#E6C673]/45',
    pickerBtnDisabled: 'text-slate-500 cursor-not-allowed opacity-60 hover:border-white/10 hover:bg-white/[0.04]',
    select:
        'w-full rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md px-4 py-3.5 outline-none transition-all text-slate-100 focus:border-[#E6C673]/45 focus:ring-1 focus:ring-[#E6C673]/15 hover:border-white/18 cursor-pointer',
    selectDisabled: 'text-slate-600 cursor-not-allowed opacity-50',
    card:
        'rounded-2xl border border-white/10 bg-[#0A0F1C]/50 backdrop-blur-xl p-4 md:p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-[#E6C673]/10 animate-fade-in',
    cardHeader: 'border-b border-white/8 pb-3',
    cardTitle: 'text-[#E6C673] font-black text-base flex items-center gap-2',
    cardSubtitle: 'text-slate-400 text-[11px] mt-1 leading-relaxed',
    subCard: 'rounded-xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-4 space-y-3',
    subCardTitle: 'text-slate-200 font-bold text-sm flex items-center gap-2',
    field:
        'w-full rounded-xl border border-white/10 bg-[#05060D]/55 text-slate-100 px-3 py-3 outline-none transition-all focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/12',
    moneyWrap:
        'flex items-center gap-2 w-full rounded-xl border border-white/10 bg-[#05060D]/55 px-3 py-3 focus-within:border-[#E6C673]/40 focus-within:ring-1 focus-within:ring-[#E6C673]/12 transition-all',
    moneyInput: 'flex-1 bg-transparent text-white outline-none font-mono text-base',
    chip:
        'rounded-full border border-[#E6C673]/30 bg-[#E6C673]/10 backdrop-blur-sm px-3 py-1 text-[10px] font-bold text-[#F0DFA8] hover:bg-[#E6C673]/18 transition-colors',
    badge:
        'inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-200/95',
    resultCard:
        'rounded-xl border border-emerald-500/20 bg-emerald-950/15 backdrop-blur-sm p-4 space-y-3',
    aggregatePanel:
        'rounded-2xl border border-[#E6C673]/28 bg-[#0A0F1C]/60 backdrop-blur-xl p-4 md:p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-[#E6C673]/18 animate-fade-in',
    aggregateTotalRow:
        'flex flex-row-reverse items-center justify-between gap-3 rounded-xl border border-[#E6C673]/30 bg-gradient-to-l from-[#E6C673]/12 to-emerald-950/20 px-4 py-4',
    aggregateTotalLabel: 'text-sm font-bold text-[#F0DFA8]',
    aggregateTotalValue: 'text-xl font-black font-mono text-[#E6C673] tabular-nums tracking-wide',
    sectionWrap: 'w-full px-3 py-4',
    sectionHeader: 'mb-5 pb-3 border-b border-[#E6C673]/20',
    sectionTitle:
        'text-xl font-black text-transparent bg-clip-text bg-gradient-to-l from-[#F5E6B8] via-[#E6C673] to-[#C9A84C] tracking-wide',
    partyGroup: 'rounded-2xl border border-white/10 bg-[#0A0F1C]/40 backdrop-blur-sm',
    partyDivider: 'py-4',
    partyDividerLine: 'h-px w-full bg-gradient-to-r from-transparent via-white/12 to-transparent',
    addBtn:
        'w-full mt-3 text-[#E6C673] bg-[#E6C673]/8 border border-[#E6C673]/28 hover:bg-[#E6C673]/14 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors',
    hintPanel: 'mt-3 space-y-2 rounded-xl border border-[#E6C673]/22 bg-[#E6C673]/6 p-3 text-right',
    hintText: 'text-[10px] leading-relaxed text-[#F0DFA8]/85',
    modalShell: 'flex flex-col w-full h-screen bg-[#0A0F1C] overflow-hidden fixed inset-0 z-[220]',
    modalHeader:
        'flex-shrink-0 flex justify-between items-center w-full border-b border-white/8 px-4 py-3 bg-[#0A0F1C]/95 backdrop-blur-xl shadow-sm z-20',
    modalHeaderTitle: 'text-lg md:text-xl font-bold text-[#E6C673] flex items-center gap-3',
    modalClose:
        'text-slate-400 hover:text-rose-300 p-2 rounded-xl transition-colors flex items-center gap-2 bg-white/[0.04] border border-white/8',
    modalBody: 'flex-1 w-full overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden px-2 py-2',
    modalBodyStack: 'w-full space-y-3',
    fieldSm:
        'w-full rounded-xl border border-white/10 bg-[#05060D]/55 text-slate-100 px-3 py-2 outline-none transition-all focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/12 text-xs text-right',
    textarea:
        'w-full rounded-xl border border-white/10 bg-[#05060D]/55 text-slate-100 px-3 py-3 outline-none transition-all focus:border-[#E6C673]/40 focus:ring-1 focus:ring-[#E6C673]/12 resize-y',
    callout: 'rounded-xl border border-[#E6C673]/22 bg-[#E6C673]/6 p-3 space-y-3 animate-fade-in',
    calloutTitle: 'text-sm font-bold text-[#E6C673] flex items-center gap-2',
    calloutDanger: 'rounded-xl border border-rose-500/35 bg-rose-950/20 p-4 animate-fade-in space-y-3',
    calloutDangerTitle: 'text-rose-300 font-bold text-lg flex items-center gap-2',
    hintWarn: 'mt-2 rounded-lg border border-amber-400/25 bg-amber-500/8 p-2',
    hintSuccess: 'mt-2 rounded-lg border border-emerald-500/25 bg-emerald-500/8 p-2',
    hintDangerInline: 'text-xs text-rose-200/90 bg-rose-950/25 border border-rose-500/20 rounded-lg p-2',
    chipToggle:
        'px-3 py-2 rounded-lg text-xs font-bold border transition-all',
    chipToggleActive: 'border-[#E6C673]/50 bg-[#E6C673]/15 text-[#E6C673]',
    chipToggleIdle: 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/18',
    radioRow:
        'flex flex-row-reverse items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
    radioRowActive: 'border-[#E6C673]/45 bg-[#E6C673]/10',
    radioRowIdle: 'border-white/10 bg-white/[0.03] hover:border-white/16',
    modalBackdrop: 'fixed inset-0 bg-black/80 z-[999999] flex items-center justify-center p-4',
    modalPanel:
        'rounded-2xl border border-[#E6C673]/30 bg-[#0A0F1C]/95 backdrop-blur-xl p-6 max-w-lg w-full',
    modalPanelDanger:
        'rounded-2xl border border-rose-500/40 bg-[#0A0F1C]/95 backdrop-blur-xl p-6 max-w-md w-full',
    modalDialogTitle: 'text-xl font-bold text-[#E6C673] mb-2 flex items-center gap-2',
    modalBtnPrimary:
        'flex-1 rounded-xl border border-[#E6C673]/45 bg-gradient-to-l from-[#E6C673]/22 to-[#E6C673]/8 py-3 text-sm font-bold text-[#F8EED0] hover:from-[#E6C673]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all',
    modalBtnGhost:
        'px-6 rounded-xl border border-white/15 bg-white/[0.04] text-slate-200 font-bold py-3 hover:bg-white/[0.08] transition-all',
    optionRow: 'flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3',
} as const;
