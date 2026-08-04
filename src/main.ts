import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { EnvService } from './config/env.service';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { buildOpenApiDocument } from './common/openapi/build-document';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  app.useGlobalPipes(new ZodValidationPipe());

  const openApiDocument = buildOpenApiDocument(app);
  // swaggerUiEnabled: false — the built-in UI serves swagger-ui-dist's JS/CSS
  // straight from node_modules at request time, which Vercel's serverless
  // bundler never includes (nothing statically imports those files), so the
  // assets 404 in production. DocsController renders the UI from a CDN
  // instead; this only keeps /docs-json (and /docs-yaml) available.
  SwaggerModule.setup('docs', app, openApiDocument, {
    swaggerUiEnabled: false,
  });

  const envService = app.get(EnvService);
  const PORT = envService.get('PORT');

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://wattdash.wattconsultoria.com.br',
      'https://new-watt-dash.vercel.app',
      /^https?:\/\/.*\.vercel\.app$/,
    ],
    credentials: true,
  });

  await app.listen(PORT);
}

void bootstrap();
