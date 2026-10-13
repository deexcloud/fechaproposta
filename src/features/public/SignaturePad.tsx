import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Eraser } from 'lucide-react';
import { palettes, tokens } from '@/theme/tokens';

export interface SignaturePadHandle {
  /** PNG da assinatura, ou null se estiver vazia. */
  toDataUrl: () => string | null;
  clear: () => void;
}

/** Área para assinar com o dedo, caneta ou mouse. */
export function SignaturePad({ ref, onChange }: { ref?: Ref<SignaturePadHandle>; onChange?: (hasInk: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  // Resolução real da tela (traço nítido no celular).
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    const { width, height } = c.getBoundingClientRect();
    c.width = Math.round(width * ratio);
    c.height = Math.round(height * ratio);
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = palettes.light.ink;
      ctx.lineWidth = 2.4;
    }
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const setInk = (value: boolean) => {
    setHasInk(value);
    onChange?.(value);
  };

  const clear = () => {
    const c = canvas.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setInk(false);
  };

  useImperativeHandle(ref, () => ({
    toDataUrl: () => (hasInk && canvas.current ? canvas.current.toDataURL('image/png') : null),
    clear,
  }));

  return (
    <Box>
      <Box sx={{ position: 'relative', borderRadius: '12px', border: `1px dashed ${tokens.borderStrong}`, bgcolor: '#fff', overflow: 'hidden' }}>
        <Box
          component="canvas"
          ref={canvas}
          aria-label="Área para desenhar sua assinatura"
          sx={{ display: 'block', width: '100%', height: 170, touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={(e: React.PointerEvent<HTMLCanvasElement>) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            last.current = point(e);
          }}
          onPointerMove={(e: React.PointerEvent<HTMLCanvasElement>) => {
            if (!drawing.current || !last.current) return;
            const ctx = canvas.current?.getContext('2d');
            const p = point(e);
            if (!ctx) return;
            ctx.beginPath();
            ctx.moveTo(last.current.x, last.current.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            last.current = p;
            if (!hasInk) setInk(true);
          }}
          onPointerUp={() => {
            drawing.current = false;
            last.current = null;
          }}
          onPointerCancel={() => {
            drawing.current = false;
            last.current = null;
          }}
        />
        <Box aria-hidden sx={{ position: 'absolute', left: 20, right: 20, bottom: 36, borderBottom: `1px solid ${tokens.border}`, pointerEvents: 'none' }} />
        {!hasInk && (
          <Typography variant="caption" sx={{ position: 'absolute', left: 0, right: 0, bottom: 12, textAlign: 'center', color: tokens.textTertiary, pointerEvents: 'none' }}>
            Assine aqui com o dedo ou o mouse
          </Typography>
        )}
      </Box>
      <Button size="small" color="inherit" startIcon={<Eraser />} onClick={clear} disabled={!hasInk} sx={{ mt: 0.5, color: tokens.textSecondary }}>
        Limpar
      </Button>
    </Box>
  );
}
