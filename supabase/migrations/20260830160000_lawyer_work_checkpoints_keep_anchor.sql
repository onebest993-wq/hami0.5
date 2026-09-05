-- أحدث حزمة مكتملة تُبقى حتى خارج نافذة الصفوف الأخيرة.
-- الخادم لا يقرأ المحتوى؛ keep_anchor يضعه العميل خارج ciphertext.

ALTER TABLE public.lawyer_work_checkpoints
  ADD COLUMN IF NOT EXISTS keep_anchor boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS lawyer_work_checkpoints_user_anchor_idx
  ON public.lawyer_work_checkpoints (user_id, created_at DESC)
  WHERE keep_anchor = true;

COMMENT ON COLUMN public.lawyer_work_checkpoints.keep_anchor IS
  'أحدث صف معلَّم يبقى مع آخر N صفوف — حزمة مكتملة لا تُحذف بفيض لاحق';
