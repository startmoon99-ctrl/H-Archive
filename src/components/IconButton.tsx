import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/utils/cx';

const ICON_SIZE = { m: 18, s: 15 } as const;

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  icon: LucideIcon;
  /** 접근성 이름이자 툴팁 */
  label: string;
  active?: boolean;
  size?: keyof typeof ICON_SIZE;
}

export function IconButton({ icon: Icon, label, active, size = 'm', className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cx('icon-btn', size === 's' && 'icon-btn--s', className)}
      aria-label={label}
      aria-pressed={active}
      title={label}
      {...rest}
    >
      <Icon size={ICON_SIZE[size]} aria-hidden />
    </button>
  );
}
