import { SetMetadata } from '@nestjs/common';

export const ROUTE_POLICY_KEY = 'route_policy';

export type RbaCondition =
  | 'self'
  | ['minRank', number]
  | ['sector', string | string[]]
  | ['roleAndSector', { roles: string[]; sectors: string[] }];

export type AccessPolicy =
  | { mode: 'unauthenticated' }
  | { mode: 'unexistent' }
  | { mode: 'authenticated'; rba?: RbaCondition[] };

export interface WritePolicy {
  superuser: string[];
  self: string[];
}

export interface FieldOutputPolicy {
  minRank: number;
  selfBypass: boolean;
}

export type OutputPolicy = Record<string, FieldOutputPolicy>;

export interface RoutePolicyOptions {
  access?: AccessPolicy;
  write?: WritePolicy;
  output?: OutputPolicy;
}

export const RoutePolicy = (policy: RoutePolicyOptions) =>
  SetMetadata(ROUTE_POLICY_KEY, policy);
