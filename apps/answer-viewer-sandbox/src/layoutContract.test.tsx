import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('mobile layout contract', () => {
  it('contains overflow protection without forced page minimum width', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    expect(css).toContain('overflow-wrap:anywhere');
    expect(css).toContain('min-width:0');
    expect(css).not.toMatch(/body\s*\{[^}]*min-width:\s*\d+px/s);
    expect(css).toContain('.table-scroll');
  });
});
