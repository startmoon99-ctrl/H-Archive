import { spaceConfig } from '@/config/space'
import { cssVars } from '@/utils/css'
import './post-effects.css'

/**
 * 화면 전체에 얹는 마무리 효과: 가장자리를 어둡게 누르는 비네트와 필름 같은 미세한 입자감.
 * 장면과 무관한 독립된 층이라 빼거나 다른 효과로 바꿔도 나머지는 그대로다.
 * 입자감은 품질 단계가 낮으면 꺼진다(:root[data-grain], environment가 설정).
 */
export function PostEffects() {
  const { grainOpacity, vignetteOpacity } = spaceConfig.effects
  return (
    <div
      className="post"
      aria-hidden="true"
      style={cssVars({ 'grain-opacity': grainOpacity, 'vignette-opacity': vignetteOpacity })}
    >
      <div className="post__vignette" />
      <div className="post__grain" />
    </div>
  )
}
