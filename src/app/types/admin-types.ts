export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  MODERATOR = 'MODERATOR',
  LAWYER = 'LAWYER',
}

export interface SystemStats {
  total_lawyers: number;
  total_cases: number;
  blocked_intrusions: number;
}

