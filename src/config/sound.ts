/**
 * 배경 음악(BGM)의 단일 출처. 곡을 늘리려면 파일을 public/audio에 넣고 여기 한 줄만 더한다.
 * 설정 화면의 목록과 재생(audio/audioManager)은 이 목록을 그대로 쓴다.
 */
export interface BgmTrack {
  id: string
  title: string
  /** public 기준 주소 */
  src: string
  /** 곡마다 다른 크기를 맞추는 기본 음량(0 ~ 1). 설정의 Volume이 여기에 곱해진다 */
  defaultVolume: number
}

export const BGM_TRACKS: readonly BgmTrack[] = [
  { id: 'orbcalm', title: 'Orbcalm', src: '/audio/orbcalm.mp3', defaultVolume: 0.6 },
]

export const SOUND = {
  /** 처음 설정: 켜 둔 채로 시작하되, 브라우저 정책 때문에 첫 클릭 · 터치 · 키 입력 뒤에 재생된다 */
  defaultEnabled: true,
  defaultVolume: 0.2,
  /** 저장 형식의 버전. 기본값을 바꿔 예전에 저장된 음량을 한 번 새 기본값으로 맞출 때 올린다 */
  settingsVersion: 2,
  /** 곡을 바꾸거나 끌 때 줄어드는 시간, 켜거나 새 곡이 시작될 때 커지는 시간, 음량 조절이 따라가는 시간(ms) */
  fadeOutMs: 500,
  fadeInMs: 1200,
  adjustMs: 120,
} as const

/** id에 맞는 곡. 없어진 곡이면 첫 곡으로 */
export function trackById(id: string): BgmTrack {
  return BGM_TRACKS.find((track) => track.id === id) ?? BGM_TRACKS[0]
}
