/**
 * حُكمُ «أيجوز النشرُ من هذه الشجرة؟» — دالّةٌ صرفة تُختبر بلا git ولا شبكة.
 *
 * **العطلُ الذي وُضعت له، مقيساً (الموجز §١٣·١):** الإنتاجُ على Vercel بُني بـ`vercel --prod` من شجرةِ عملٍ لم
 * تُلتزم — نصُّ شاشته الأولى في صفرِ التزامٍ من التاريخ كلّه — ووسمُه متأخّرٌ مئاتِ الالتزامات ولم يمرّ على CI
 * قطّ. و`vercel --prod` يرفع ما في القرص لا ما في git.
 *
 * **فالشروطُ الثلاثة، ولا يسقط منها شيء:**
 *   ١. الرأسُ هو `origin/main` بعينه — لا فرعٌ ولا التزامٌ محلّيّ لم يُدفع.
 *   ٢. الشجرةُ نظيفةٌ تماماً: لا تعديلَ متتبَّعاً ولا ملفَّ غيرَ متتبَّع (عدا ما يتجاهله git). **لا قائمةَ استثناء:**
 *      شجرةُ العمل اليومية لا تصلح للنشر، والنشرُ من شجرةٍ مستقلّة على `origin/main` (`git worktree add`).
 *   ٣. سيرُ Quality Gate على هذا الرأس `success`، وكلُّ سيرٍ آخر عمل عليه `success` — **لا «لم يعمل» ولا «جارٍ»**.
 */

/**
 * @param {{
 *   headSha: string, originMainSha: string | null,
 *   statusEntries: string[],
 *   workflowRuns: Array<{ name: string, status: string, conclusion: string | null }> | null,
 * }} facts
 * @returns {{ ready: boolean, reasons: string[] }}
 */
export function evaluateDeployReadiness(facts) {
    const reasons = [];
    if (!facts.originMainSha) {
        reasons.push('origin/main غيرُ معروف — نفّذ git fetch origin main أوّلاً');
    } else if (facts.headSha !== facts.originMainSha) {
        reasons.push(
            `الرأسُ ${facts.headSha.slice(0, 8)} ليس origin/main (${facts.originMainSha.slice(0, 8)}) — يُنشر ما دُمج في main فقط`,
        );
    }

    if (facts.statusEntries.length) {
        const sample = facts.statusEntries.slice(0, 5).join(' · ');
        reasons.push(`الشجرةُ غيرُ نظيفة (${facts.statusEntries.length}): ${sample} — انشر من شجرةٍ مستقلّة على origin/main`);
    }

    if (!facts.workflowRuns) {
        reasons.push('تعذّرت قراءةُ CI لهذا الرأس — لا يُنشر ما لم يُرَ نجاحُه');
    } else {
        if (!facts.workflowRuns.some((r) => r.name === 'Quality Gate')) reasons.push('لا سيرَ Quality Gate على هذا الرأس');
        for (const run of facts.workflowRuns) {
            if (run.status !== 'completed') reasons.push(`${run.name} لم ينتهِ (${run.status})`);
            else if (run.conclusion !== 'success') reasons.push(`${run.name} = ${run.conclusion}`);
        }
    }
    return { ready: reasons.length === 0, reasons };
}
