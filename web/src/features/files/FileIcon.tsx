import {
  File as FileGlyph,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  Link2,
  Package,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { FileKind } from './fileUtils';

const ICONS: Record<FileKind, { icon: LucideIcon; className: string }> = {
  folder: { icon: Folder, className: 'text-warning' },
  image: { icon: FileImage, className: 'text-info' },
  video: { icon: FileVideo, className: 'text-accent' },
  audio: { icon: FileAudio, className: 'text-success' },
  archive: { icon: FileArchive, className: 'text-warning' },
  apk: { icon: Package, className: 'text-accent' },
  code: { icon: FileCode2, className: 'text-info' },
  text: { icon: FileText, className: 'text-muted' },
  file: { icon: FileGlyph, className: 'text-muted' },
};

export function FileIcon({
  kind,
  isLink = false,
  className,
}: {
  kind: FileKind;
  isLink?: boolean;
  className?: string;
}) {
  const { icon: Icon, className: tone } = ICONS[kind];
  return (
    <span className={cn('relative grid size-6 shrink-0 place-items-center rounded-[6px] bg-surface-2', className)}>
      <Icon className={cn('size-3.5', tone)} strokeWidth={2} />
      {isLink ? (
        <span className="absolute -bottom-0.5 -right-0.5 grid size-3 place-items-center rounded-full bg-surface text-muted">
          <Link2 className="size-2.5" strokeWidth={2.4} />
        </span>
      ) : null}
    </span>
  );
}
