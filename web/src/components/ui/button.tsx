import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-on-accent shadow-[0_6px_16px_-12px_rgba(228,87,46,0.9)] hover:bg-accent-hover active:translate-y-px',
        outline:
          'border border-line-strong bg-surface text-ink-soft hover:border-ink hover:bg-surface-2 hover:text-ink',
        ghost: 'text-ink-soft hover:bg-surface-3 hover:text-ink',
        danger: 'bg-danger text-on-danger hover:bg-danger-hover',
        'danger-ghost': 'text-muted hover:bg-danger-soft hover:text-danger',
      },
      size: {
        sm: 'h-6 rounded-md px-1.5 text-[11.5px]',
        md: 'h-7 rounded-[7px] px-2 text-[12px]',
        lg: 'h-[34px] rounded-control px-3.5 text-[12.5px]',
        icon: 'size-8 rounded-control',
        'icon-sm': 'size-7 rounded-[7px]',
      },
    },
    defaultVariants: { variant: 'outline', size: 'lg' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, type, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
