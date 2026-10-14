import { useState, type FormEvent } from 'react'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/Button'
import { Field } from '@/components/form/Field'
import { APP } from '@/config/app'
import { useSessionStore } from '@/store/sessionStore'
import './sign-in-gate.css'

/**
 * 원격 저장소를 쓸 때의 입구. 로그인 전에는 공간 위를 덮어 기록을 불러오지 않는다.
 * 브라우저 저장(local)일 때는 나타나지 않는다.
 */
export function SignInGate() {
  const status = useSessionStore((state) => state.status)
  const signIn = useSessionStore((state) => state.signIn)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status !== 'signed-out') return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '로그인하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gate">
      <form className="gate__panel" onSubmit={submit} aria-label="로그인">
        <p className="gate__brand">{APP.name}</p>
        <p className="gate__text">나의 공간으로 들어가기</p>
        <Field label="이메일" htmlFor="gate-email">
          <input
            id="gate-email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="비밀번호" htmlFor="gate-password" error={error}>
          <input
            id="gate-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Button type="submit" icon={LogIn} variant="primary" magnetic disabled={busy}>
          {busy ? '들어가는 중' : '들어가기'}
        </Button>
      </form>
    </div>
  )
}
