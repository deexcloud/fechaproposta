import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

type From = 'up' | 'left' | 'right' | 'scale';

/**
 * Revela o conteúdo quando ele entra na tela (subindo, de lado ou crescendo).
 * Sem biblioteca: um IntersectionObserver compartilhado + CSS (`[data-reveal]` em theme.ts).
 * Cada elemento anima uma vez só. Com "reduzir movimento" ligado, aparece direto.
 */
let observer: IntersectionObserver | null = null;
function observe(el: HTMLElement) {
  if (typeof IntersectionObserver === 'undefined') {
    el.dataset.visible = '';
    return () => undefined;
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).dataset.visible = '';
        observer!.unobserve(e.target);
      }
    },
    // Dispara um pouco antes do fim da tela, para não parecer atrasado.
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  observer.observe(el);
  return () => observer?.unobserve(el);
}

export function Reveal({ children, from = 'up', delay = 0, sx, component }: { children: ReactNode; from?: From; delay?: number; sx?: SxProps<Theme>; component?: React.ElementType }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => (ref.current ? observe(ref.current) : undefined), []);
  return (
    <Box ref={ref} component={component ?? 'div'} data-reveal={from} style={{ '--fp-reveal-delay': `${delay}ms` } as CSSProperties} sx={sx}>
      {children}
    </Box>
  );
}
