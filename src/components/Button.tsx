import { useRef, type ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useMagnetic } from '@/motion/usePointerReactive'
import { cx } from '@/utils/css'
import './button.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger'
  size?: 'md' | 'sm'
  icon?: LucideIcon
  /** 커서 쪽으로 살짝 끌려오는 반응 */
  magnetic?: boolean
}

export function Button({
  variant = 'ghost',
  size = 'md',
  icon: Icon,
  magnetic = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  useMagnetic(ref, magnetic)
  return (
    <button
      ref={ref}
      type={type}
      className={cx('button', className)}
      data-variant={variant}
      data-size={size}
      data-icon-only={!children}
      {...rest}
    >
      {Icon && <Icon className="button__icon" aria-hidden="true" />}
      {children}
    </button>
  )
}

interface IconButtonProps extends Omit<ButtonProps, 'children' | 'aria-label'> {
  icon: LucideIcon
  /** 화면에는 보이지 않는 이름 */
  label: string
}

export function IconButton({ label, ...rest }: IconButtonProps) {
  return <Button aria-label={label} title={label} {...rest} />
}
