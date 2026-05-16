-- =====================================================
-- نظام ملف الدعوى الذكي - Database Schema
-- تاريخ الإنشاء: 6 مارس 2026
-- الإصدار: v1.0
-- =====================================================

-- تفعيل UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. جدول ملفات التنفيذ (Execution Files)
-- =====================================================

CREATE TABLE IF NOT EXISTS execution_files (
  -- المعرف الفريد
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- ربط الملف بالمستخدم (المحامي)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- البيانات الأساسية
  case_no TEXT NOT NULL,                    -- رقم الدعوى (مثال: 2026/123)
  execution_type TEXT NOT NULL,             -- نوع التنفيذ: مدني/شرعي/التزام بعمل
  court TEXT,                               -- المحكمة المختصة
  execution_basis TEXT,                     -- سند التنفيذ
  
  -- البيانات المشفرة (للخصوصية والأمان)
  -- هذا الحقل يحتوي على: creditor, debtor, totalAmount, وجميع البيانات الحساسة
  encrypted_data TEXT NOT NULL,
  
  -- التوقيع الرقمي (للتحقق من سلامة البيانات)
  data_signature TEXT NOT NULL,
  
  -- نسخة نظام الأمان (للترقية التلقائية)
  security_version INTEGER DEFAULT 3,       -- v3.0 = UnifiedSecurityCore
  
  -- الحالة
  status TEXT DEFAULT 'active',             -- active, archived, completed
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- الفهارس لتحسين الأداء
CREATE INDEX idx_execution_user ON execution_files(user_id);
CREATE INDEX idx_execution_case_no ON execution_files(case_no);
CREATE INDEX idx_execution_status ON execution_files(status);
CREATE INDEX idx_execution_created ON execution_files(created_at DESC);

-- =====================================================
-- 2. جدول ملفات الدعاوى (Lawsuit Files)
-- =====================================================

CREATE TABLE IF NOT EXISTS lawsuit_files (
  -- المعرف الفريد
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- ربط الملف بالمستخدم
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- البيانات الأساسية
  case_no TEXT NOT NULL,                    -- رقم الدعوى
  court TEXT NOT NULL,                      -- المحكمة
  stage TEXT NOT NULL,                      -- المرحلة: بداءة/استئناف/تمييز
  case_type TEXT,                           -- نوع الدعوى
  
  -- ربط المراحل (للاستئناف والتمييز)
  parent_id UUID REFERENCES lawsuit_files(id) ON DELETE SET NULL,
  
  -- البيانات المشفرة
  encrypted_data TEXT NOT NULL,
  data_signature TEXT NOT NULL,
  security_version INTEGER DEFAULT 3,
  
  -- الحالة
  status TEXT DEFAULT 'active',
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- الفهارس
CREATE INDEX idx_lawsuit_user ON lawsuit_files(user_id);
CREATE INDEX idx_lawsuit_case_no ON lawsuit_files(case_no);
CREATE INDEX idx_lawsuit_stage ON lawsuit_files(stage);
CREATE INDEX idx_lawsuit_parent ON lawsuit_files(parent_id);
CREATE INDEX idx_lawsuit_status ON lawsuit_files(status);
CREATE INDEX idx_lawsuit_created ON lawsuit_files(created_at DESC);

-- =====================================================
-- 3. جدول الملاحظات العامة (Global Notes)
-- =====================================================

CREATE TABLE IF NOT EXISTS global_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- محتوى الملاحظة
  title TEXT,
  content TEXT NOT NULL,
  category TEXT,                            -- دعاوى/تنفيذ/عام
  
  -- العلامات
  tags TEXT[],
  
  -- التواريخ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notes_user ON global_notes(user_id);
CREATE INDEX idx_notes_category ON global_notes(category);
CREATE INDEX idx_notes_created ON global_notes(created_at DESC);

-- =====================================================
-- 4. Row Level Security (RLS) Policies
-- =====================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE execution_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawsuit_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_notes ENABLE ROW LEVEL SECURITY;

-- سياسات execution_files
CREATE POLICY "Users can view own execution files"
  ON execution_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own execution files"
  ON execution_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own execution files"
  ON execution_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own execution files"
  ON execution_files FOR DELETE
  USING (auth.uid() = user_id);

-- سياسات lawsuit_files
CREATE POLICY "Users can view own lawsuit files"
  ON lawsuit_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lawsuit files"
  ON lawsuit_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lawsuit files"
  ON lawsuit_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lawsuit files"
  ON lawsuit_files FOR DELETE
  USING (auth.uid() = user_id);

-- سياسات global_notes
CREATE POLICY "Users can view own notes"
  ON global_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON global_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON global_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON global_notes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. Trigger لتحديث updated_at تلقائياً
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق Trigger على الجداول
CREATE TRIGGER update_execution_files_updated_at
  BEFORE UPDATE ON execution_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lawsuit_files_updated_at
  BEFORE UPDATE ON lawsuit_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_notes_updated_at
  BEFORE UPDATE ON global_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. Views للإحصائيات (اختياري - للمستقبل)
-- =====================================================

CREATE OR REPLACE VIEW user_execution_stats AS
SELECT 
  user_id,
  COUNT(*) as total_files,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_files,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_files,
  MAX(created_at) as last_activity
FROM execution_files
GROUP BY user_id;

CREATE OR REPLACE VIEW user_lawsuit_stats AS
SELECT 
  user_id,
  COUNT(*) as total_files,
  COUNT(CASE WHEN stage = 'بداءة' THEN 1 END) as first_instance,
  COUNT(CASE WHEN stage = 'استئناف' THEN 1 END) as appeal,
  COUNT(CASE WHEN stage = 'تمييز' THEN 1 END) as cassation,
  MAX(created_at) as last_activity
FROM lawsuit_files
GROUP BY user_id;

-- =====================================================
-- 7. التعليقات والتوثيق
-- =====================================================

COMMENT ON TABLE execution_files IS 'جدول ملفات التنفيذ - يحتوي على جميع ملفات التنفيذ (مدني/شرعي) مع بيانات مشفرة';
COMMENT ON TABLE lawsuit_files IS 'جدول ملفات الدعاوى - يحتوي على جميع الدعاوى (بداءة/استئناف/تمييز) مع نظام parent-child';
COMMENT ON TABLE global_notes IS 'جدول الملاحظات العامة - ملاحظات المحامي غير المرتبطة بملف معين';

COMMENT ON COLUMN execution_files.encrypted_data IS 'بيانات مشفرة بواسطة UnifiedSecurityCore v3.0 - تحتوي على creditor, debtor, totalAmount, وجميع البيانات الحساسة';
COMMENT ON COLUMN execution_files.data_signature IS 'التوقيع الرقمي لضمان عدم العبث بالبيانات';
COMMENT ON COLUMN execution_files.security_version IS 'نسخة نظام الأمان (3 = UnifiedSecurityCore)';

-- =====================================================
-- 8. إنشاء Indexes إضافية للبحث النصي (GIN)
-- =====================================================

-- للبحث في رقم الدعوى بشكل أسرع
CREATE INDEX idx_execution_case_no_trgm ON execution_files USING gin(case_no gin_trgm_ops);
CREATE INDEX idx_lawsuit_case_no_trgm ON lawsuit_files USING gin(case_no gin_trgm_ops);

-- ملاحظة: قد تحتاج إلى تفعيل pg_trgm extension:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- تم الانتهاء من إنشاء Database Schema
-- الحالة: جاهز للاستخدام ✅
-- =====================================================
