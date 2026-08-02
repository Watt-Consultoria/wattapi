import type { INestApplication } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import type { OpenAPIObject } from '@nestjs/swagger';
import {
  ROUTE_POLICY_KEY,
  type RoutePolicyOptions,
} from '../decorators/route-policy.decorator';
import { describeAccessPolicy } from './describe-access-policy';

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
] as const;

type OperationObject = {
  operationId?: string;
  description?: string;
  security?: Array<Record<string, string[]>>;
};

// @nestjs/swagger names each operation `<ControllerClassName>_<handlerName>`.
// That gives an exact controller+handler match without having to reconstruct
// and normalize Express route params (`:id`) into OpenAPI's `{id}` syntax.
function parseOperationId(
  operationId: string,
): { controllerName: string; handlerName: string } | null {
  const separatorIndex = operationId.indexOf('_');
  if (separatorIndex === -1) return null;

  return {
    controllerName: operationId.slice(0, separatorIndex),
    handlerName: operationId.slice(separatorIndex + 1),
  };
}

// Reads the same `@RoutePolicy` metadata `RoutePolicyGuard` consumes at
// runtime and writes the authorization rule directly into the OpenAPI
// operation description — so the docs can't drift from the actual guard.
export function applyRoutePolicyDescriptions(
  app: INestApplication,
  document: OpenAPIObject,
): OpenAPIObject {
  const discoveryService = app.get(DiscoveryService);
  const reflector = app.get(Reflector);

  const controllersByName = new Map<string, { prototype: object }>();
  for (const wrapper of discoveryService.getControllers()) {
    if (wrapper.metatype) {
      controllersByName.set(wrapper.metatype.name, wrapper.metatype);
    }
  }

  for (const pathItem of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, unknown>)[method] as
        | OperationObject
        | undefined;
      if (!operation?.operationId) continue;

      const parsed = parseOperationId(operation.operationId);
      if (!parsed) continue;

      const controller = controllersByName.get(parsed.controllerName);
      if (!controller) continue;

      const handler = (controller.prototype as Record<string, unknown>)[
        parsed.handlerName
      ];
      if (typeof handler !== 'function') continue;

      const policy = reflector.get<RoutePolicyOptions | undefined>(
        ROUTE_POLICY_KEY,
        handler,
      );
      if (!policy?.access) continue;

      const authDescription = describeAccessPolicy(policy.access);
      operation.description = operation.description
        ? `${operation.description}\n\n${authDescription}`
        : authDescription;

      // `.addBearerAuth()` only registers the scheme — each operation still
      // needs its own security requirement for Swagger UI's "try it out" to
      // actually attach the token. Driven by the same metadata as the guard,
      // instead of a manual `@ApiBearerAuth()` on every controller.
      // `RoutePolicyGuard.requireClaims` demands a valid token for both
      // 'authenticated' and 'unexistent' modes — only 'unauthenticated'
      // truly needs no token.
      if (policy.access.mode !== 'unauthenticated') {
        operation.security = [{ bearer: [] }];
      }
    }
  }

  return document;
}
