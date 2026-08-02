import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { applyRoutePolicyDescriptions } from './apply-route-policy-descriptions';

// Shared by the runtime bootstrap (main.ts, serves interactive Swagger UI)
// and the static export script (generate-openapi.ts, writes openapi.json)
// so both always produce the exact same document from a single source.
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('WattAPI')
    .setDescription(
      'Documentação gerada a partir dos schemas zod de request/response e do metadata de @RoutePolicy de cada rota.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  return applyRoutePolicyDescriptions(app, cleanupOpenApiDoc(document));
}
