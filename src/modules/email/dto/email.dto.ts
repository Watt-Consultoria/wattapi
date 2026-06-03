export interface ViolationNotificationPayload {
  memberName: string;
  memberEmail: string;
  normCode: string;
  normDescription: string;
  severity: 'leve' | 'moderada' | 'grave' | 'desligamento';
  points: number;
  reason: string | null;
  expiresAt: string;
  currentScore: number;
  atRisk: boolean;
}
