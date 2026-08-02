import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('openapi.json static artifact', () => {
  test('Exists at the project root and is a valid OpenAPI document', () => {
    const path = join(process.cwd(), 'openapi.json');
    expect(existsSync(path)).toBe(true);

    const raw = readFileSync(path, 'utf-8');
    const document = JSON.parse(raw) as {
      openapi?: string;
      paths?: Record<string, unknown>;
    };

    expect(document.openapi).toMatch(/^3\./);
    expect(document.paths).toBeDefined();
    expect(Object.keys(document.paths ?? {}).length).toBeGreaterThan(0);
  });
});
