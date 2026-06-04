import { SetMetadata } from '@nestjs/common';

export const ROUTE_POLICY_KEY = 'route_policy';

export type RbaAccessCondition =
  | ['role', string[]]
  | ['sector', string[]]
  | ['role AND sector', { roles: string[]; sectors: string[] }];

export type AccessPolicy =
  | { mode: 'unauthenticated' }
  | { mode: 'unexistent' }
  | { mode: 'authenticated'; rba?: RbaAccessCondition[] };

export interface FieldOutputPolicy {
  minRank: number;
  selfBypass: boolean;
}

export type OutputPolicy = Record<string, FieldOutputPolicy>;

export interface RoutePolicyOptions {
  access: AccessPolicy;
  output?: OutputPolicy;
}

export const RoutePolicy = (policy: RoutePolicyOptions) =>
  SetMetadata(ROUTE_POLICY_KEY, policy);
