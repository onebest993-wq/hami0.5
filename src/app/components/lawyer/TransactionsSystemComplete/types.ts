export type DepartmentType = 'tabu' | 'traffic' | 'tax' | 'retirement' | 'notary' | 'other';

export type TransactionStatus = 'pending' | 'in-progress' | 'review' | 'completed' | 'archived' | 'blocked';

export type ViewMode = 'main' | 'new' | 'details' | 'analytics' | 'archive';

export interface Transaction {
  id: string;
  clientName: string;
  clientPhone?: string;
  departmentType: DepartmentType;
  transactionType: string;
  details: Record<string, string>;
  status: TransactionStatus;
  currentStep: string;
  createdAt: Date;
  completedAt?: Date;
  proxyNumber?: string;
  proxyDate?: string;
  receiptNumber?: string;
  steps: TransactionStep[];
  documents: TransactionDocument[];
  expenses: Expense[];
  lawyerFee: {
    total: number;
    paid: number;
    remaining: number;
  };
  clerkAssigned?: {
    name: string;
    phone: string;
    assignedAt: Date;
    completedCount?: number;
  };
  handoverSignature?: {
    signedAt: Date;
    method: 'digital' | 'whatsapp';
    signatureData?: string;
  };
  missingDocs?: string[];
  appointments?: CalendarAppointment[];
}

export interface TransactionStep {
  id: string;
  label: string;
  completed: boolean;
  date?: Date;
  appointmentDate?: Date;
  appointmentTime?: string;
}

export interface TransactionDocument {
  id: string;
  name: string;
  type: 'proxy' | 'id' | 'deed' | 'photo' | 'clearance' | 'other';
  url?: string;
  uploadedAt: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date;
  category: 'official' | 'misc' | 'lawyer-fee';
}

export interface CalendarAppointment {
  id: string;
  stepId: string;
  date: Date;
  time: string;
  location?: string;
  notes?: string;
}
