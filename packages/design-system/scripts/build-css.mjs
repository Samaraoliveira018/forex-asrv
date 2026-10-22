import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const source = resolve(root, 'packages/design-system/src/web/styles.css');
const targetDir = resolve(root, 'packages/design-system/dist');
const rootTarget = resolve(root, 'design-system.css');
const banner =
  '/* Arquivo gerado por packages/design-system/scripts/build-css.mjs. Edite src/web/styles.css. */\n';

const css = banner + readFileSync(source, 'utf8');

mkdirSync(targetDir, { recursive: true });
writeFileSync(resolve(targetDir, 'design-system.css'), css, 'utf8');
writeFileSync(rootTarget, css, 'utf8');

console.log('design-system.css gerado em packages/design-system/dist e na raiz.');
