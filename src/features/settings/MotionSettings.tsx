import { Clapperboard } from 'lucide-react'
import { Button } from '@/components/Button'
import { REDUCED_MOTION_PRESET, motionControls, motionPresets } from '@/config/motion'
import { useMotionStore } from '@/store/motionStore'
import { useUiStore } from '@/store/uiStore'

/**
 * 사이트의 움직임을 직접 조절한다. 프리셋과 슬라이더는 config/motion.ts의
 * motionPresets · motionControls를 그대로 그리므로 항목을 늘려도 이 파일은 바뀌지 않는다.
 */
export function MotionSettings() {
  const presetId = useMotionStore((state) => state.presetId)
  const settings = useMotionStore((state) => state.settings)
  const followSystem = useMotionStore((state) => state.followSystem)
  const systemReduced = useMotionStore((state) => state.systemReduced)
  const { setPreset, setSetting, setFollowSystem } = useMotionStore.getState()
  const replayIntro = useUiStore((state) => state.replayIntro)

  // 시스템 설정을 따르는 동안에는 아래 값이 적용되지 않는다
  const overridden = systemReduced && followSystem

  return (
    <section className="settings__section" aria-labelledby="settings-motion">
      <h3 id="settings-motion" className="eyebrow">
        Motion
      </h3>

      {systemReduced && (
        <label className="settings__toggle">
          <span>
            시스템의 ‘동작 줄이기’ 따르기
            <small>켜 두면 {motionPresets[REDUCED_MOTION_PRESET].label} 프리셋으로 고정됩니다.</small>
          </span>
          <input
            type="checkbox"
            checked={followSystem}
            onChange={(event) => setFollowSystem(event.target.checked)}
          />
        </label>
      )}

      <div className="settings__presets" role="radiogroup" aria-label="모션 프리셋">
        {Object.values(motionPresets).map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="settings__preset"
            role="radio"
            aria-checked={!overridden && presetId === preset.id}
            disabled={overridden}
            onClick={() => setPreset(preset.id)}
          >
            <strong>{preset.label}</strong>
            <span>{preset.description}</span>
          </button>
        ))}
      </div>

      <details className="settings__advanced">
        <summary>
          Advanced Settings
          {presetId === 'custom' && <span className="settings__custom">직접 조절함</span>}
        </summary>
        <div className="settings__controls">
          {motionControls.map((control) => (
            <label key={control.key} className="settings__control">
              <span>
                {control.label}
                <small>{control.hint}</small>
              </span>
              <output>{settings[control.key].toFixed(2)}</output>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={settings[control.key]}
                disabled={overridden}
                onChange={(event) => setSetting(control.key, Number(event.target.value))}
              />
            </label>
          ))}
          <label className="settings__toggle">
            <span>
              Preview Autoplay
              <small>마우스를 올리거나 선택하면 미리보기 영상을 재생</small>
            </span>
            <input
              type="checkbox"
              checked={settings.previewAutoplay}
              disabled={overridden}
              onChange={(event) => setSetting('previewAutoplay', event.target.checked)}
            />
          </label>
        </div>
      </details>

      <Button icon={Clapperboard} variant="ghost" size="sm" onClick={replayIntro}>
        인트로 다시 보기
      </Button>
    </section>
  )
}
