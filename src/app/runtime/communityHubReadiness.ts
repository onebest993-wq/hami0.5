/**
 * جهوزيّة قشرة المنتدى — ورقة بلا اعتماديات.
 *
 * هذه الدالّات الأربع لا تحتاج `CommunityScreen` ولا شيئاً غيره: ثلاثٌ تُعيد ثابتاً
 * وواحدة `noop`. وسبب وجودها أن المنتدى صار **متزامناً في الجذع**: من استورد
 * `communityHubLoader` فقد حمّل الشاشة باستيراده نفسه، فلا يبقى للتحميل المسبق عمل،
 * ولا لسؤال «هل جهزت الوحدة؟» جواب غير «نعم».
 *
 * وكونها ساكنةً في `communityHubLoader` كان يُغلق دائرة من ستّة ملفّات:
 *
 *   useCommunityScreenController → forumIntentWarm
 *     → communityHubLoader → CommunityScreen → CommunityScreenContent
 *     → useCommunityScreenController
 *
 * فكان `forumIntentWarm` يستورد `prefetchCommunityScreenModule` — وهي `noop` حرفياً —
 * فيسحب باستيرادها شجرة الشاشة كلّها ثابتاً ويُقيم الضلع الراجع. والدائرة على مسار
 * قسمٍ كامل ليست مسألة ترتيبٍ نظريّة: عطل TDZ في حلقة كهذه يُسقط القسم عند أول فتح،
 * وقد وقع نظيره في حلقة `executionDossierBlobPersistence`.
 *
 * `communityHubLoader` يُعيد تصديرها، فمن كان يستوردها منه — ومنهم مُرطِّب الإقلاع
 * والاختبارات التي تُبدّل الوحدة — لا يتغيّر عنده شيء.
 */

/** الوحدة متزامنة في الجذع — الجواب ثابت */
export function isCommunityScreenModuleResolved(): boolean {
    return true;
}

/** يبقى للتوافق؛ المحتوى أصلاً في الجذع عند تركيب Host */
export function prefetchCommunityScreenModule(): void {
    if (typeof window === 'undefined') return;
}

export function hydrateCommunityScreenForInstantOpen(): Promise<boolean> {
    return Promise.resolve(true);
}

/** للاختبارات — لا كاش يُفرَّغ في وحدة متزامنة */
export function resetCommunityHubModuleCacheForTests(): void {
    /* noop */
}
