type ISODateTimeString = string;

export enum TransactionStatus {
  Active = 'Active',
  Paused = 'Paused',
  Completed = 'Completed',
}

export enum TransactionTaskStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Blocked = 'Blocked',
  Done = 'Done',
}

export interface Transaction {
  id: string;
  title: string;
  clientName: string;
  targetDepartment: string;
  status: TransactionStatus;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  /** أرشفة — تُخفى من القائمة الرئيسية */
  archivedAt?: ISODateTimeString | null;
  /** حذف ناعم — تظهر في «محذوفة» */
  deletedAt?: ISODateTimeString | null;
}

export interface TransactionTask {
  id: string;
  transactionId: string;
  title: string;
  status: TransactionTaskStatus;
  parentTaskId: string | null;
  notes: string | null;
  deadline: ISODateTimeString | null;
  officialReference: string | null;
  createdAt: ISODateTimeString;
  completedAt: ISODateTimeString | null;
}

export type TransactionTaskNode = TransactionTask & { children: TransactionTaskNode[] };

export type TransactionDocumentOwnerTag = 'للموكل' | 'للدائرة' | 'أخرى';

export interface TransactionDocument {
  id: string;
  transactionId: string;
  type: string;
  title: string;
  ownerTag: TransactionDocumentOwnerTag;
  uploadedAt: ISODateTimeString;
}
