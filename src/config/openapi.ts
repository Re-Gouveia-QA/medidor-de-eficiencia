import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';

/** Carrega a spec OpenAPI de docs/openapi.yaml (raiz do projeto, fora de src/dist). */
export function loadOpenApiDocument(): Record<string, unknown> {
  const filePath = path.join(process.cwd(), 'docs', 'openapi.yaml');
  const file = fs.readFileSync(filePath, 'utf8');
  return load(file) as Record<string, unknown>;
}
