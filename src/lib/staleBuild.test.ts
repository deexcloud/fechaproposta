import { describe, expect, it } from 'vitest';
import { isStaleBuildError } from './staleBuild';

describe('arquivo de versão antiga do site', () => {
  it('reconhece as mensagens dos navegadores', () => {
    expect(isStaleBuildError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js'))).toBe(true);
    expect(isStaleBuildError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isStaleBuildError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isStaleBuildError(new TypeError("Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of 'text/html'. Strict MIME type checking is enforced for module scripts per HTML spec. is not a valid JavaScript MIME type"))).toBe(true);
  });

  it('não confunde com outros erros', () => {
    expect(isStaleBuildError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isStaleBuildError(null)).toBe(false);
  });
});
