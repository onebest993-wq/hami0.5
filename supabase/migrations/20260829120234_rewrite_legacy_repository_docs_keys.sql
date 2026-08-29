-- ترحيل مفاتيح المستودع القديمة repository:docs:<docId>
-- إلى الشكل المملوك repository:docs:<authorId>:<docId>
-- يتخطى الصفوف بلا authorId أو عند تعارض المفتاح الجديد.
-- النسخة تطابق الهجرة المطبّقة على مشروع hami 0.5 (wldjvjnodvyodmgbgzab).

UPDATE public.kv_store_f09713ba AS k
SET key = 'repository:docs:' || l.author_id || ':' || l.doc_id
FROM (
  SELECT
    key AS old_key,
    COALESCE(to_jsonb(value) ->> 'authorId', to_jsonb(value) ->> 'author_id', '') AS author_id,
    substr(key, char_length('repository:docs:') + 1) AS doc_id
  FROM public.kv_store_f09713ba
  WHERE key LIKE 'repository:docs:%'
    AND key NOT LIKE 'repository:docs:%:%'
) AS l
WHERE k.key = l.old_key
  AND length(trim(l.author_id)) > 0
  AND position(':' in l.author_id) = 0
  AND position(':' in l.doc_id) = 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.kv_store_f09713ba AS x
    WHERE x.key = 'repository:docs:' || l.author_id || ':' || l.doc_id
  );
