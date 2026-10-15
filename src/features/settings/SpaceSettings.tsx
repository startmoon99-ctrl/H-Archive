import { Move } from 'lucide-react'
import { useId } from 'react'
import { useArchiveNav } from '@/app/useArchiveRoute'
import { Button } from '@/components/Button'
import { spaceConfig } from '@/config/space'
import { selectActiveMotion, useMotionStore } from '@/store/motionStore'
import { usePlacementStore } from '@/store/placementStore'
import { useSkyStore } from '@/store/skyStore'
import { useUiStore } from '@/store/uiStore'

const starLevels = spaceConfig.particles.stars.levels
const orbitLevels = spaceConfig.camera.idleOrbit.levels

/** 단계를 고르는 bar. 지금 단계의 이름을 오른쪽에 보여 주고, 단계마다 눈금을 둔다 */
function StepBar({
  label,
  hint,
  steps,
  value,
  onChange,
}: {
  label: string
  hint: string
  steps: readonly { label: string }[]
  value: number
  onChange: (value: number) => void
}) {
  const ticksId = useId()
  return (
    <label className="settings__control">
      <span>
        {label}
        <small>{hint}</small>
      </span>
      <output>{steps[value].label}</output>
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={value}
        list={ticksId}
        aria-valuetext={steps[value].label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <datalist id={ticksId}>
        {steps.map((step, index) => (
          <option key={step.label} value={index} label={step.label} />
        ))}
      </datalist>
    </label>
  )
}

/**
 * 공간의 배치 · 별빛 · 카메라. 성단 위치 조절을 누르면 설정이 닫히고 전체 보기에서 성단을 끌어 옮길 수 있다.
 * 단계는 config/space.ts의 stars.levels · camera.idleOrbit.levels를 그대로 그리므로 단계를 늘려도 이 파일은 바뀌지 않는다.
 */
export function SpaceSettings({ onClose }: { onClose: () => boolean }) {
  const nav = useArchiveNav()
  const setArranging = useUiStore((state) => state.setArranging)
  const moved = usePlacementStore((state) => Object.keys(state.placements).length)
  const level = useSkyStore((state) => state.level)
  const meteors = useSkyStore((state) => state.meteors)
  const orbit = useSkyStore((state) => state.orbit)
  const { setLevel, setMeteors, setOrbit } = useSkyStore.getState()
  // Background Motion이 0이면(동작 줄이기 포함) 별빛과 카메라는 움직이지 않는다
  const still = useMotionStore((state) => selectActiveMotion(state).background <= 0)

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
          <StepBar
            label="생동감"
            hint="별의 반짝임 · 빛살 · 떠다니는 움직임"
            steps={starLevels}
            value={level}
            onChange={setLevel}
          />
          <label className="settings__toggle">
            <span>
              별똥별
              <small>멀리서 별똥별이 천천히 지나가다 빛살로 반짝이며 사라집니다</small>
            </span>
            <input type="checkbox" checked={meteors} onChange={(event) => setMeteors(event.target.checked)} />
          </label>
        </div>
      </div>

      <div className="settings__group" role="group" aria-labelledby="settings-space-camera">
        <h4 id="settings-space-camera" className="settings__subhead">
          카메라
        </h4>
        <div className="settings__controls">
          <StepBar
            label="가만히 있을 때"
            hint="메인 화면에서 성단을 천천히 둘러봐요"
            steps={orbitLevels}
            value={orbit}
            onChange={setOrbit}
          />
        </div>
        {still && (
          <p className="settings__text" data-tone="faint">
            지금은 움직임이 꺼져 있어(Background Motion 0 · 동작 줄이기) 별빛과 카메라가 멈춰 있습니다.
          </p>
        )}
      </div>
    </section>
  )
}
