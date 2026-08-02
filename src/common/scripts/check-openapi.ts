import 'reflect-metadata';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { buildOpenApiDocument } from '../openapi/build-document';

// Finds the first line where the committed and generated documents diverge
// so a stale-docs failure points at a location instead of just "it's stale".
function describeFirstDifference(committed: string, generated: string): string {
  const committedLines = committed.split('\n');
  const generatedLines = generated.split('\n');
  const maxLines = Math.max(committedLines.length, generatedLines.length);

  for (let i = 0; i < maxLines; i++) {
    const committedLine = committedLines[i];
    const generatedLine = generatedLines[i];
    if (committedLine !== generatedLine) {
      return (
        `First difference at line ${i + 1}:\n` +
        `  committed:  ${committedLine ?? '<no line>'}\n` +
        `  generated:  ${generatedLine ?? '<no line>'}`
      );
    }
  }

  return 'Files differ only in trailing whitespace/newline.';
}

async function check(): Promise<void> {
  const committedPath = join(process.cwd(), 'openapi.json');
  if (!existsSync(committedPath)) {
    console.error(
      'openapi.json not found at the project root — run `npm run docs:generate` first.',
    );
    process.exitCode = 1;
    return;
  }
  const committed = readFileSync(committedPath, 'utf-8');

  // abortOnError: false — without it, a bootstrap failure (e.g. a missing
  // required env var caught by src/config/env.ts's validateEnv) is swallowed
  // by Nest's internal ExceptionsZone, which calls process.exit(1) itself
  // before this script ever sees the error. That produces a CI failure with
  // zero log output. Disabling it lets the error reach our own try/catch below.
  const document = await (async () => {
    const app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });
    try {
      return buildOpenApiDocument(app);
    } finally {
      await app.close();
    }
  })();

  const tmpPath = join(tmpdir(), `openapi-check-${Date.now()}.json`);
  writeFileSync(tmpPath, `${JSON.stringify(document, null, 2)}\n`, 'utf-8');
  const generated = readFileSync(tmpPath, 'utf-8');

  if (committed !== generated) {
    console.error(
      'openapi.json is stale — it does not match the document generated from the current code.\n' +
        'Run `npm run docs:generate` and commit the result.\n\n' +
        describeFirstDifference(committed, generated),
    );
    process.exitCode = 1;
    return;
  }

  console.log('openapi.json is up to date.');
}

check().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(
    `openapi.json check crashed before it could run the comparison:\n${message}`,
  );
  process.exitCode = 1;
});
