-- فهارس تجميع إحصائيات المقر: court فقط عبر service_role، بدون فك التشفير.
CREATE INDEX IF NOT EXISTS idx_lawsuit_files_active_court
  ON public.lawsuit_files (court)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_execution_files_active_court
  ON public.execution_files (court)
  WHERE status = 'active';
