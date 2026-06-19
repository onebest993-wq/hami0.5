/** @deprecated استخدم lawBundleStore — إبقاء للتوافق مع الاختبارات القديمة. */
export {
  createLawRowId,
  devLocalClearLaws,
  devLocalImportLawArticles,
  devLocalInsertLaw,
  devLocalListLaws,
  parseDevLocalArticleBound,
  readLawBundleFile,
  shouldUseDevLocalLawsStore,
  writeLawBundleFile,
  type DevLawRow,
} from './lawBundleStore.ts';
