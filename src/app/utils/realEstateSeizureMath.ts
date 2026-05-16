export function computeNewDossierAmountAfterRealEstateSale(args: {
    currentDossierAmount: number;
    salePriceIqd: number;
}): number {
    const cur = Number(args.currentDossierAmount);
    const sale = Number(args.salePriceIqd);
    if (!Number.isFinite(cur) || cur <= 0) return 0;
    if (!Number.isFinite(sale) || sale <= 0) return cur;
    const next = cur - sale;
    return next <= 0 ? 0 : next;
}

