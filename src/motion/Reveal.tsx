import type { ReactNode } from 'react'
import { useInView } from '@/hooks/useInView'
import { cssVars, cx } from '@/utils/css'
import './reveal.css'

interface RevealProps {
  /** rise: 떠오름 / blur: 초점이 맞음 / mask: 아래에서 위로 드러남 */
  variant?: 'rise' | 'blur' | 'mask'
  /** 같은 묶음 안에서의 순서. 차례로 나타나게 한다. */
  index?: number
  className?: string
  children: ReactNode
}

/** 화면에 들어올 때 한 번 나타나는 묶음. 거리 · 흐림 · 시간은 모션 설정을 따른다. */
export function Reveal({ variant = 'rise', index = 0, className, children }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>({ once: true, rootMargin: '0px 0px -8% 0px' })
  return (
    <div
      ref={ref}
      className={cx('reveal', className)}
      data-variant={variant}
      data-revealed={inView}
      style={cssVars({ 'reveal-index': index })}
    >
      {children}
    </div>
  )
}
