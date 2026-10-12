import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/config/app'
import { INTRO_LETTER_SPREAD, introSequences, type IntroMode, type IntroStep } from '@/config/intro'
import { getMotion } from '@/motion/runtime'
import { useUiStore } from '@/store/uiStore'
import { cssVars } from '@/utils/css'
import './intro.css'

type Stage = 'in' | 'hold' | 'out'
const NEXT_STAGE: Record<Stage, Stage | null> = { in: 'hold', hold: 'out', out: null }

/** 처음이면 전체 인트로, 다시 온 방문이거나 움직임을 줄였다면 짧은 인트로 */
function chooseMode(replayed: boolean): IntroMode {
  if (replayed) return 'full'
  if (getMotion().intensity === 0) return 'quick'
  return localStorage.getItem(STORAGE_KEYS.introSeen) ? 'quick' : 'full'
}

function IntroLine({ step, stage }: { step: IntroStep; stage: Stage }) {
  const letters = [...step.text]
  const letterDelay = (step.in * INTRO_LETTER_SPREAD) / letters.length
  return (
    <p
      className="intro__line"
      data-stage={stage}
      aria-label={step.text}
      style={cssVars({ in: `${step.in}ms`, out: `${step.out}ms`, 'letter-delay': `${letterDelay}ms` })}
    >
      {letters.map((letter, index) => (
        <span key={index} className="intro__letter" aria-hidden="true" style={cssVars({ i: index })}>
          {letter === ' ' ? ' ' : letter}
        </span>
      ))}
    </p>
  )
}

/** 인트로 한 번의 재생. 다시 보기를 하면 key가 바뀌어 새로 만들어진다. */
function IntroRun({ mode }: { mode: IntroMode }) {
  const phase = useUiStore((state) => state.introPhase)
  const startReveal = useUiStore((state) => state.startReveal)
  const finishIntro = useUiStore((state) => state.finishIntro)
  const sequence = introSequences[mode]
  const [started, setStarted] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [stage, setStage] = useState<Stage>('in')
  const step = sequence.steps[stepIndex]

  const skip = useCallback(() => {
    if (useUiStore.getState().introPhase === 'playing') startReveal(introSequences.quick.revealMs)
  }, [startReveal])

  // 글자 순서를 진행한다
  useEffect(() => {
    if (phase !== 'playing') return
    if (!started) {
      const lead = window.setTimeout(() => setStarted(true), sequence.leadMs)
      return () => window.clearTimeout(lead)
    }
    if (!step) {
      startReveal(sequence.revealMs)
      return
    }
    const timer = window.setTimeout(() => {
      const next = NEXT_STAGE[stage]
      if (next) {
        setStage(next)
      } else {
        setStage('in')
        setStepIndex((index) => index + 1)
      }
    }, step[stage])
    return () => window.clearTimeout(timer)
  }, [phase, started, step, stage, sequence, startReveal])

  // 카메라가 은하에 다다르면 인트로를 끝낸다
  const revealMs = useUiStore((state) => state.introRevealMs)
  useEffect(() => {
    if (phase !== 'revealing') return
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEYS.introSeen, '1')
      finishIntro()
    }, revealMs)
    return () => window.clearTimeout(timer)
  }, [phase, revealMs, finishIntro])

  useEffect(() => {
    if (phase !== 'playing') return
    window.addEventListener('keydown', skip)
    return () => window.removeEventListener('keydown', skip)
  }, [phase, skip])

  return (
    <div className="intro" data-phase={phase} style={cssVars({ reveal: `${revealMs}ms` })} onClick={skip}>
      <div className="intro__light" aria-hidden="true" />
      {started && step && phase === 'playing' && <IntroLine key={step.id} step={step} stage={stage} />}
      {phase === 'playing' && mode === 'full' && (
        <button type="button" className="intro__skip eyebrow" onClick={skip}>
          Skip
        </button>
      )}
    </div>
  )
}

/** 시네마틱 인트로: 검은 화면 → H ARCHIVE → MY CREATIVE HISTORY → 은하로 진입 */
export function Intro() {
  const phase = useUiStore((state) => state.introPhase)
  const run = useUiStore((state) => state.introRun)
  if (phase === 'done') return null
  return <IntroRun key={run} mode={chooseMode(run > 0)} />
}
