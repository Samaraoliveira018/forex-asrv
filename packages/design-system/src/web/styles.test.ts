import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const css = readFileSync(resolve(root, 'packages/design-system/src/web/styles.css'), 'utf8');
const generated = readFileSync(resolve(root, 'design-system.css'), 'utf8');
const index = readFileSync(resolve(root, 'index.html'), 'utf8');

describe('CSS compartilhado com o index.html', () => {
  it('usa a paleta do app atual', () => {
    expect(css).toContain('--asrv-color-background: #101118');
    expect(css).toContain('--asrv-color-surface: #191b26');
    expect(css).toContain('--asrv-color-primary: #c4b5fd');
    expect(css).toContain('--asrv-color-success: #a7dccb');
  });

  it('expõe os componentes extraídos do index.html', () => {
    for (const selector of [
      '.asrv-card',
      '.asrv-stat__value',
      '.asrv-nav-item.is-active',
      '.asrv-topbar',
      '.asrv-segmented__item',
      '.asrv-streak',
      '.asrv-milestone',
      '.asrv-progress__bar',
      '.asrv-table',
      '.asrv-trade-card',
      '.asrv-modal',
      '.asrv-badge--pill',
    ]) {
      expect(css).toContain(selector);
    }
  });

  it('mantém o CSS gerado sincronizado com a fonte', () => {
    expect(generated).toContain(css.trim());
  });

  it('index.html importa o CSS e usa as classes do design system', () => {
    expect(index).toContain('<link rel="stylesheet" href="./design-system.css">');
    expect(index).toContain('body class="asrv-app');
    expect(index).toContain('asrv-sidebar');
    expect(index).toContain('asrv-card');
    expect(index).toContain('asrv-trade-card');
    expect(index).toContain('asrv-modal__panel');
  });
});
