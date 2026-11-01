import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardPaste, Copy, Eraser, RotateCcw, TextSelect } from 'lucide-react';
import { useT } from '@/lib/i18n';

function MenuItem({ icon, label, onSelect }: { icon: ReactNode; label: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] text-bay-text outline-none hover:bg-bay-3 focus-visible:bg-bay-3"
      onClick={onSelect}
    >
      {icon}
      {label}
    </button>
  );
}

export interface TerminalContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onRestart: () => void;
}

export function TerminalContextMenu(props: TerminalContextMenuProps) {
  const t = useT();
  const menuRef = useRef<HTMLDivElement>(null);
  const { open, onClose } = props;

  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', pointer);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', pointer);
      window.removeEventListener('keydown', key);
    };
  }, [open, onClose]);

  if (!props.open) return null;
  const left = Math.min(props.x, window.innerWidth - 196);
  const top = Math.min(props.y, window.innerHeight - 240);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={t('terminal.action.menu')}
      className="pop-anim fixed z-50 w-[184px] rounded-[10px] border border-bay-line bg-bay-2 p-1 shadow-float"
      style={{ left, top }}
      onContextMenu={event => event.preventDefault()}
    >
      <MenuItem
        icon={<Copy className="size-3.5" />}
        label={t('terminal.action.copy')}
        onSelect={() => {
          props.onCopy();
          props.onClose();
        }}
      />
      <MenuItem
        icon={<ClipboardPaste className="size-3.5" />}
        label={t('terminal.action.paste')}
        onSelect={() => {
          props.onPaste();
          props.onClose();
        }}
      />
      <MenuItem
        icon={<TextSelect className="size-3.5" />}
        label={t('terminal.action.selectAll')}
        onSelect={() => {
          props.onSelectAll();
          props.onClose();
        }}
      />
      <div className="mx-1 my-1 h-px bg-bay-line" />
      <MenuItem
        icon={<Eraser className="size-3.5" />}
        label={t('terminal.action.clear')}
        onSelect={() => {
          props.onClear();
          props.onClose();
        }}
      />
      <MenuItem
        icon={<RotateCcw className="size-3.5" />}
        label={t('terminal.action.restart')}
        onSelect={() => {
          props.onRestart();
          props.onClose();
        }}
      />
    </div>,
    document.body,
  );
}
