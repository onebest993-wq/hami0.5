/**
 * اسمُ الـchunk بلا بصمته — مفتاحُ المقارنة في `chunk-baseline`.
 *
 * بصمةُ Rollup (`[hash]` في `chunkFileNames` بـ`vite.config.mts`) ثمانيةُ محارف من أبجدية base64url، **ومنها `_`
 * و`-`**. وكان المفتاحُ يُنزع بـ`-[a-zA-Z0-9]+\.js$`، فالبصمةُ التي فيها `_` لا تُنزع، والتي فيها `-` تُنزع نصفَها:
 * يصير الملفُّ «جديداً» ويخرج من المقارنة **بصمت** — لا رقمَ يُقارن ولا سقوط.
 *
 * **والطولُ ثابتٌ عمداً:** `[A-Za-z0-9_-]+` يبدأ من أوّل شرطةٍ في الاسم، فيجمع `execution-dashboard-scope` و
 * `execution-handler-cluster-party` تحت مفتاحٍ واحد.
 */
export const ROLLUP_HASH_SUFFIX = /-[A-Za-z0-9_-]{8}\.js$/;

export function chunkPrefix(file) {
    return file.replace(ROLLUP_HASH_SUFFIX, '');
}
