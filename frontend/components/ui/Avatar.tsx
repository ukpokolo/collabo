import { avatarColor, cn, initials } from '@/lib/utils';

const SIZES = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-7 w-7 text-[11px]',
  lg: 'h-8 w-8 text-xs',
} as const;

export type AvatarSize = keyof typeof SIZES;

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
  title?: string;
  ring?: boolean;
}

export function Avatar({ name, size = 'sm', className, title, ring = true }: AvatarProps) {
  return (
    <span
      title={title ?? name}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white',
        ring && 'ring-2 ring-surface',
        SIZES[size],
        avatarColor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

interface AvatarStackProps {
  names: string[];
  max?: number;
  size?: AvatarSize;
  className?: string;
  highlight?: string;
}

export function AvatarStack({
  names,
  max = 4,
  size = 'lg',
  className,
  highlight,
}: AvatarStackProps) {
  const visible = names.slice(0, max);
  const overflow = names.length - visible.length;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((name, index) => (
        <Avatar
          key={`${name}-${index}`}
          name={name}
          size={size}
          title={name === highlight ? `${name} (you)` : name}
          className={cn(name === highlight && 'ring-primary')}
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-surface-sunken font-semibold text-foreground-muted ring-2 ring-surface',
            SIZES[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
