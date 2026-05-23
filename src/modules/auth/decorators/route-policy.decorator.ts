import { SetMetadata } from '@nestjs/common';

export const ROUTE_POLICY_KEY = 'route_policy';

export type AccessMode =
  | 'authenticated'
  | 'min-rank'
  | 'superuser-or-self'
  | 'superuser-only';

export interface AccessPolicy {
  mode: AccessMode;
  minRank?: number;
  noSelfAccess?: boolean;
}

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
