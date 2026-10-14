import { BGM_TRACKS } from '@/config/sound'
import { useSoundStore } from '@/store/soundStore'

/** 배경 음악. 곡 목록은 config/sound.ts의 BGM_TRACKS를 그대로 그리므로 곡을 늘려도 이 파일은 바뀌지 않는다. */
export function SoundSettings() {
  const enabled = useSoundStore((state) => state.enabled)
  const trackId = useSoundStore((state) => state.trackId)
  const volume = useSoundStore((state) => state.volume)
  const { setEnabled, setTrack, setVolume } = useSoundStore.getState()

  return (
    <section className="settings__section" aria-labelledby="settings-sound">
      <h3 id="settings-sound" className="eyebrow">
        Sound
      </h3>

      <div className="settings__group" role="group" aria-labelledby="settings-sound-bgm">
        <h4 id="settings-sound-bgm" className="settings__subhead">
          BGM
        </h4>

        <label className="settings__toggle">
          <span>재생</span>
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        </label>

        <div className="settings__controls">
          <label className="settings__control">
            <span>곡</span>
            <select
              className="input"
              value={trackId}
              disabled={!enabled}
              onChange={(event) => setTrack(event.target.value)}
            >
              {BGM_TRACKS.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.title}
                </option>
              ))}
            </select>
          </label>

          <label className="settings__control">
            <span>Volume</span>
            <output>{Math.round(volume * 100)}</output>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              disabled={!enabled}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </label>
        </div>
      </div>
    </section>
  )
}
