export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  MODERATOR = 'MODERATOR',
  LAWYER = 'LAWYER',
  CLIENT = 'CLIENT',
}

export interface SystemStats {
  total_lawyers: number;
  total_cases: number;
  blocked_intrusions: number;
}

export enum RequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

export type LegalRequestAIMetadata = {
  summary: string;
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  deadline?: string;
  suggested_action?: string;
};

export interface LegalRequest {
  id: string;
  client_id: string;
  lawyer_id: string;
  title: string;
  encrypted_details: string;
  data_signature: string;
  smart_summary?: string;
  due_at?: string;
  opened_at?: string | null;
  ai_metadata?: LegalRequestAIMetadata;
  status: RequestStatus;
  created_at: string;
}
