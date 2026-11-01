import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { AlertTriangle, ArrowLeft, Clock3, House, MonitorOff } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useT, type MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { CropOverlay } from './CropOverlay';
import type { SessionStatus } from './scrcpySession';
import { NAV_KEYS } from './scrcpyInput';
import type { MirrorInput } from './useMirrorInput';
import type { VideoContent } from './videoPadding';

interface MirrorStageProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  status: SessionStatus | 'idle';
  error: string;
  width: number;
  height: number;
  content: VideoContent | undefined;
  fill: boolean;
  input: MirrorInput;
  showNavKeys: boolean;
  uhidMouse: boolean;
  cropPicking: boolean;
  cropTarget: { width: number; height: number };
  onCropApply: (crop: string) => void;
  onCropCancel: () => void;
  onNavKey: (key: string) => void;
}

const STATUS_KEY: Record<SessionStatus | 'idle', MessageKey> = {
  idle: 'mirror.stage.idle',
  connecting: 'mirror.stage.connecting',
  connected: 'mirror.stage.connected',
  error: 'mirror.stage.error',
};

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-[7px] text-bay-text/85 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

export function MirrorStage({
  canvasRef,
  status,
  error,
  width,
  height,
  content,
  fill,
  input,
  showNavKeys,
  uhidMouse,
  cropPicking,
  cropTarget,
  onCropApply,
  onCropCancel,
  onNavKey,
}: MirrorStageProps) {
  const t = useT();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const wheelRef = useRef(input.onWheel);
  useEffect(() => {
    wheelRef.current = input.onWheel;
  }, [input.onWheel]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      wheelRef.current({
        clientX: event.clientX,
        clientY: event.clientY,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        currentTarget: stage,
      });
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, []);

  const coordinates = input.coordinates;
  // The stream is letterboxed by a few black rows inside the codec-aligned frame.
  // On the docked desktop column, where the stage matches the content ratio,
  // oversize and offset the canvas so only the real screen content is visible.
  const canvasStyle: CSSProperties =
    fill && content
      ? {
          top: `${(-content.top / content.height) * 100}%`,
          height: `${((content.top + content.height + content.bottom) / content.height) * 100}%`,
          objectFit: 'fill',
        }
      : { top: 0, height: '100%', objectFit: fill ? 'fill' : 'contain' };
  const coordinateWidth = content?.width ?? width;
  const coordinateHeight = content?.height ?? height;
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] border border-bay-line bg-[#08090b] shadow-[0_18px_40px_-32px_rgba(16,18,22,0.9)]">
      <div
        ref={stageRef}
        tabIndex={0}
        role="application"
        aria-label={t('mirror.stage.aria')}
        className="absolute inset-0 touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bay-accent"
        onPointerDown={input.onPointerDown}
        onPointerMove={input.onPointerMove}
        onPointerUp={input.onPointerUp}
        onPointerCancel={input.onPointerUp}
        onLostPointerCapture={input.onPointerUp}
        onPointerLeave={input.onPointerLeave}
        onKeyDown={input.onKeyDown}
        onKeyUp={input.onKeyUp}
        onPaste={input.onPaste}
        onBlur={input.releaseInput}
        onContextMenu={event => event.preventDefault()}
      >
        <canvas ref={canvasRef} style={canvasStyle} className="absolute left-0 block w-full" />
      </div>

      {cropPicking ? (
        <CropOverlay
          width={width}
          height={height}
          content={content}
          fill={fill}
          target={cropTarget}
          onApply={onCropApply}
          onCancel={onCropCancel}
        />
      ) : null}

      {status !== 'connected' ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#08090b]/55 px-6 text-center">
          <div className="flex max-w-[440px] flex-col items-center gap-3">
            {status === 'connecting' ? <Spinner className="size-5" label={t('mirror.stage.connectingSpinner')} /> : null}
            {status === 'idle' ? <MonitorOff className="size-6 text-bay-muted" strokeWidth={1.7} /> : null}
            {status === 'error' ? <AlertTriangle className="size-6 text-bay-accent" strokeWidth={1.7} /> : null}
            <p className="text-[12.5px] font-semibold text-bay-text">{t(STATUS_KEY[status])}</p>
            {status === 'error' && error ? (
              <p className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-bay-muted">
                {error}
              </p>
            ) : null}
            {status === 'idle' ? <p className="text-[11.5px] text-bay-muted">{t('mirror.stage.idleHint')}</p> : null}
          </div>
        </div>
      ) : null}

      {uhidMouse && status === 'connected' ? (
        <div className="pointer-events-none absolute right-3 top-3 rounded-[7px] border border-white/10 bg-black/70 px-2 py-1 text-[10px] font-medium text-bay-muted">
          {input.mouseLocked ? t('mirror.stage.pointerLocked') : t('mirror.stage.pointerLockHint')}
        </div>
      ) : null}

      {input.showCoordinates ? (
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-0.5 rounded-[7px] border border-white/10 bg-black/75 px-2.5 py-1.5 mono leading-tight">
          <span className="text-[10.5px] font-semibold text-bay-text">
            X {coordinates?.x ?? '—'} · Y {coordinates?.y ?? '—'}
          </span>
          <span className="text-[9px] text-bay-muted">
            {coordinates && coordinateWidth > 0 && coordinateHeight > 0
              ? t('mirror.stage.relative', {
                  x: ((coordinates.x / coordinateWidth) * 100).toFixed(1),
                  y: ((coordinates.y / coordinateHeight) * 100).toFixed(1),
                })
              : t('mirror.stage.pointerMoveHint')}
          </span>
        </div>
      ) : null}

      {showNavKeys ? (
        <nav
          aria-label={t('mirror.stage.navAria')}
          className={cn(
            'absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-[10px] border border-bay-line',
            'bg-bay-2/95 px-1.5 py-1 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.85)]',
          )}
        >
          <NavButton label={t('mirror.stage.navBack')} onClick={() => onNavKey(NAV_KEYS.back)}>
            <ArrowLeft className="size-[18px]" />
          </NavButton>
          <NavButton label={t('mirror.stage.navHome')} onClick={() => onNavKey(NAV_KEYS.home)}>
            <House className="size-[18px]" />
          </NavButton>
          <NavButton label={t('mirror.stage.navRecents')} onClick={() => onNavKey(NAV_KEYS.recents)}>
            <Clock3 className="size-[18px]" />
          </NavButton>
        </nav>
      ) : null}
    </div>
  );
}
