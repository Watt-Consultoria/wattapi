import 'reflect-metadata';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { buildOpenApiDocument } from '../openapi/build-document';

async function check(): Promise<void> {
  const committedPath = join(process.cwd(), 'openapi.json');
  if (!existsSync(committedPath)) {
    console.error(
      'openapi.json not found at the project root — run `npm run docs:generate` first.',
    );
    process.exit(1);
  }
  const committed = readFileSync(committedPath, 'utf-8');

  const app = await NestFactory.create(AppModule, { logger: false });
  const document = buildOpenApiDocument(app);
  await app.close();

  const tmpPath = join(tmpdir(), `openapi-check-${Date.now()}.json`);
  writeFileSync(tmpPath, `${JSON.stringify(document, null, 2)}\n`, 'utf-8');
  const generated = readFileSync(tmpPath, 'utf-8');

  if (committed !== generated) {
    console.error(
      'openapi.json is stale — it does not match the document generated from the current code.\n' +
        'Run `npm run docs:generate` and commit the result.',
    );
    process.exit(1);
  }

  console.log('openapi.json is up to date.');
}

void check();
