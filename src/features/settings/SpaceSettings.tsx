import { Move } from 'lucide-react'
import { useId } from 'react'
import { useArchiveNav } from '@/app/useArchiveRoute'
import { Button } from '@/components/Button'
import { spaceConfig } from '@/config/space'
import { selectActiveMotion, useMotionStore } from '@/store/motionStore'
import { usePlacementStore } from '@/store/placementStore'
import { useSkyStore } from '@/store/skyStore'
import { useUiStore } from '@/store/uiStore'

const levels = spaceConfig.particles.stars.levels

/**
 * 공간의 배치와 별빛. 성단 위치 조절을 누르면 설정이 닫히고 전체 보기에서 성단을 끌어 옮길 수 있다.
 * 별빛의 단계는 config/space.ts의 stars.levels를 그대로 그리므로 단계를 늘려도 이 파일은 바뀌지 않는다.
 */
export function SpaceSettings({ onClose }: { onClose: () => boolean }) {
  const nav = useArchiveNav()
  const setArranging = useUiStore((state) => state.setArranging)
  const moved = usePlacementStore((state) => Object.keys(state.placements).length)
  const level = useSkyStore((state) => state.level)
  const meteors = useSkyStore((state) => state.meteors)
  const { setLevel, setMeteors } = useSkyStore.getState()
  // Background Motion이 0이면(동작 줄이기 포함) 별빛은 움직이지 않는다
  const still = useMotionStore((state) => selectActiveMotion(state).background <= 0)
  const ticksId = useId()

  const start = () => {
    onClose()
    nav.toGalaxy()
    setArranging(true)
  }

  return (
    <section className="settings__section" aria-labelledby="settings-space">
      <h3 id="settings-space" className="eyebrow">
        Space
      </h3>
      <p className="settings__text">
        성단을 끌어 원하는 자리에 놓습니다. 시점을 돌려 가며 앞뒤로도 옮길 수 있어요.
      </p>
      <p className="settings__text" data-tone="faint">
        {moved > 0 ? `직접 옮긴 성단 ${moved}개 · ` : ''}옮긴 자리는 이 브라우저에만 저장됩니다.
      </p>
      <Button icon={Move} variant="ghost" size="sm" onClick={start}>
        성단 위치 조절
      </Button>

      <div className="settings__group" role="group" aria-labelledby="settings-space-sky">
        <h4 id="settings-space-sky" className="settings__subhead">
          별빛
        </h4>
        <div className="settings__controls">
          <label className="settings__control">
            <span>
              생동감
              <small>별의 반짝임 · 빛살 · 떠다니는 움직임</small>
            </span>
            <output>{levels[level].label}</output>
            <input
              type="range"
              min={0}
              max={levels.length - 1}
              step={1}
              value={level}
              list={ticksId}
              aria-valuetext={levels[level].label}
              onChange={(event) => setLevel(Number(event.target.value))}
            />
            <datalist id={ticksId}>
              {levels.map((item, index) => (
                <option key={item.label} value={index} label={item.label} />
              ))}
            </datalist>
          </label>
          <label className="settings__toggle">
            <span>
              별똥별
              <small>멀리서 별똥별이 천천히 지나가다 빛살로 반짝이며 사라집니다</small>
            </span>
            <input type="checkbox" checked={meteors} onChange={(event) => setMeteors(event.target.checked)} />
          </label>
        </div>
        {still && (
          <p className="settings__text" data-tone="faint">
            지금은 움직임이 꺼져 있어(Background Motion 0 · 동작 줄이기) 별빛이 멈춰 있습니다.
          </p>
        )}
      </div>
    </section>
  )
}
