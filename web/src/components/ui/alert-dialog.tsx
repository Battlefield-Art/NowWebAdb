import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import type { ComponentProps, ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(16,18,22,0.55)] backdrop-blur-[1px]" />
      <AlertDialogPrimitive.Content
        className={cn(
          'pop-anim fixed left-1/2 top-1/2 z-50 w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2',
          'rounded-[14px] border border-line bg-surface p-5 shadow-float',
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn('text-[15px] font-bold tracking-[-0.01em] text-ink', className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn('mt-2 text-[12.5px] leading-relaxed text-muted', className)}
      {...props}
    />
  );
}

export function AlertDialogActions({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mt-5 flex items-center justify-end gap-2', className)} {...props} />;
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonProps['variant'];
  onConfirm: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'danger',
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const t = useT();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        {children ? <div className="mt-3">{children}</div> : null}
        <AlertDialogActions>
          <AlertDialogPrimitive.Cancel asChild>
            <Button variant="outline" size="md">
              {cancelLabel ?? t('common.cancel')}
            </Button>
          </AlertDialogPrimitive.Cancel>
          <AlertDialogPrimitive.Action asChild>
            <Button variant={confirmVariant} size="md" onClick={onConfirm}>
              {confirmLabel ?? t('common.confirm')}
            </Button>
          </AlertDialogPrimitive.Action>
        </AlertDialogActions>
      </AlertDialogContent>
    </AlertDialog>
  );
}
