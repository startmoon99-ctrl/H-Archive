import { useCallback, useState } from 'react'

/**
 * 저장 버튼의 공통 흐름: 진행 문구 표시 → 실행 → 실패하면 창을 닫지 않고 이유를 보여준다.
 * run이 문자열을 돌려주면 입력 오류로 보고 그대로 안내한다.
 */
export function useSubmit() {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async (label: string, run: (progress: (label: string) => void) => Promise<string | void>) => {
    setBusy(label)
    setError(null)
    try {
      const problem = await run(setBusy)
      if (problem) setError(problem)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.')
    } finally {
      setBusy(null)
    }
  }, [])

  return { busy, error, submit }
}
