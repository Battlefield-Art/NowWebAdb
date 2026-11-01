import { useEffect, useMemo, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { mapFilledPosition, mapVideoPosition } from './scrcpyInput';
import type { VideoContent } from './videoPadding';

interface CropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CropOverlayProps {
  width: number;
  height: number;
  content: VideoContent | undefined;
  fill: boolean;
  target: { width: number; height: number };
  onApply: (crop: string) => void;
  onCancel: () => void;
}

const even = (value: number) => Math.floor(value / 2) * 2;

function toRect(a: { x: number; y: number }, b: { x: number; y: number }): CropRect {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export function CropOverlay({ width, height, content, fill, target, onApply, onCancel }: CropOverlayProps) {
  const t = useT();
  const [bounds, setBounds] = useState<DOMRect>();
  const [start, setStart] = useState<{ x: number; y: number }>();
  const [rect, setRect] = useState<CropRect>();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const crop = useMemo(() => {
    if (!rect || !bounds || width <= 0 || height <= 0) return undefined;
    const map = (x: number, y: number) => {
      const clientX = bounds.left + x;
      const clientY = bounds.top + y;
      const point = fill
        ? mapFilledPosition(clientX, clientY, bounds, width, height, content)
        : mapVideoPosition(clientX, clientY, bounds, width, height);
      return point;
    };
    const first = map(rect.left, rect.top);
    const last = map(rect.left + rect.width, rect.top + rect.height);
    if (!first || !last || target.width <= 0 || target.height <= 0) return undefined;
    const contentTop = content?.top ?? 0;
    const contentHeight = content?.height ?? height;
    const left = Math.min(first.x, last.x) / width;
    const right = Math.max(first.x, last.x) / width;
    const top = (Math.min(first.y, last.y) - contentTop) / contentHeight;
    const bottom = (Math.max(first.y, last.y) - contentTop) / contentHeight;
    const x = Math.max(0, Math.min(target.width - 2, even(left * target.width)));
    const y = Math.max(0, Math.min(target.height - 2, even(top * target.height)));
    const w = Math.min(target.width - x, even((right - left) * target.width));
    const h = Math.min(target.height - y, even((bottom - top) * target.height));
    if (w < 8 || h < 8) return undefined;
    return { x, y, width: w, height: h, text: `${w}:${h}:${x}:${y}` };
  }, [bounds, content, fill, height, rect, target.height, target.width, width]);

  const point = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
      y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
    };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('button')) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = point(event);
    if (!next) return;
    setBounds(event.currentTarget.getBoundingClientRect());
    setStart(next);
    setRect(undefined);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!start) return;
    const next = point(event);
    if (next) setRect(toRect(start, next));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!start) return;
    const next = point(event);
    if (next) setRect(toRect(start, next));
    setStart(undefined);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      tabIndex={0}
      role="application"
      aria-label={t('mirror.crop.aria')}
      className="absolute inset-0 z-20 cursor-crosshair select-none bg-black/30 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bay-accent"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
        <span className="rounded-[7px] border border-white/10 bg-black/75 px-2.5 py-1 text-[11px] text-bay-text">
          {t('mirror.crop.hint')}
        </span>
      </div>

      {rect ? (
        <div
          className="pointer-events-none absolute border-2 border-bay-accent bg-bay-accent/15"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        >
          {crop ? (
            <span className="absolute -top-6 left-0 rounded bg-bay-accent px-1.5 py-0.5 mono text-[10px] text-bay-1">
              {crop.text}
            </span>
          ) : null}
        </div>
      ) : null}

      {rect ? (
        <div className="absolute inset-x-0 bottom-3 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-bay-line bg-bay-2/95 py-1 pl-3 pr-1 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.85)]">
            <span className="mono text-[10.5px] text-bay-muted">
              {crop ? crop.text : t('mirror.crop.tooSmall')}
            </span>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="primary" disabled={!crop} onClick={() => crop && onApply(crop.text)}>
              {t('mirror.crop.apply')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
