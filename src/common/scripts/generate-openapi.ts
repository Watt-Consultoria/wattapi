import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { buildOpenApiDocument } from '../openapi/build-document';

async function generate(): Promise<void> {
  // abortOnError: false — see check-openapi.ts for why. Without it, a
  // bootstrap failure is swallowed by Nest's internal ExceptionsZone, which
  // calls process.exit(1) itself before this script can log anything.
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  let document;
  try {
    document = buildOpenApiDocument(app);
  } finally {
    await app.close();
  }

  const outputPath = join(process.cwd(), 'openapi.json');
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf-8');
  console.log(`openapi.json written to ${outputPath}`);
}

generate().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`openapi.json generation crashed:\n${message}`);
  process.exitCode = 1;
});
