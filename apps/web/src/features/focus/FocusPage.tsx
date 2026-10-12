import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTasks } from '@/features/tasks/hooks'
import { startFocus, finishFocus } from '@/lib/api'
import { useAuth } from '@/app/AuthProvider'
import { Play, Pause, Square, Link2 } from 'lucide-react'

type Phase = 'focus' | 'break' | 'long_break'

interface TimerState {
  sessionId: string | null
  taskId: string | null
  phase: Phase
  startedAt: number // Date.now()
  round: number
  paused: boolean
  pausedAt: number | null
  pausedElapsed: number
  plannedMinutes: number
}

const LS_KEY = 'mindtrack_focus_timer'

function loadState(): TimerState | null {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') } catch { return null }
}
function saveState(s: TimerState | null) {
  if (s) localStorage.setItem(LS_KEY, JSON.stringify(s))
  else localStorage.removeItem(LS_KEY)
}

export function FocusPage() {
  const [searchParams] = useSearchParams()
  const queryTaskId = searchParams.get('taskId') ?? ''
  const { profile } = useAuth()
  const focusMin = profile?.focus_minutes ?? 25
  const breakMin = profile?.break_minutes ?? 5
  const longBreakMin = profile?.long_break_minutes ?? 15

  const [timer, setTimer] = useState<TimerState | null>(() => loadState())
  const [selectedPhase, setSelectedPhase] = useState<Phase>('focus')
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => queryTaskId)
  const [now, setNow] = useState(Date.now())
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (queryTaskId) setSelectedTaskId(queryTaskId)
  }, [queryTaskId])
  const qc = useQueryClient()
  const { data: tasks } = useTasks({ status: 'todo' })

  const currentPhase: Phase = timer ? timer.phase : selectedPhase

  const phaseDuration = useCallback((phase: Phase) => {
    if (phase === 'focus') return focusMin * 60_000
    if (phase === 'long_break') return longBreakMin * 60_000
    return breakMin * 60_000
  }, [focusMin, breakMin, longBreakMin])

  // Tick
  useEffect(() => {
    if (!timer || timer.paused) { if (tickRef.current) clearInterval(tickRef.current); return }
    tickRef.current = setInterval(() => setNow(Date.now()), 500)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [timer?.paused, !!timer])

  // Phase end detection
  useEffect(() => {
    if (!timer || timer.paused) return
    const elapsed = now - timer.startedAt + timer.pausedElapsed
    const total = phaseDuration(timer.phase)
    if (elapsed >= total) phaseComplete()
  }, [now, timer, phaseDuration])

  const elapsed = timer && !timer.paused
    ? now - timer.startedAt + timer.pausedElapsed
    : timer?.pausedElapsed ?? 0
  const currentDuration = phaseDuration(currentPhase)
  const remaining = Math.max(0, currentDuration - elapsed)
  const secs = Math.floor(remaining / 1000)
  const display = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
  const progress = timer ? (elapsed / currentDuration) * 100 : 0

  // Update document title
  useEffect(() => {
    if (timer) document.title = `${display} – MindTrack`
    else document.title = 'MindTrack'
    return () => { document.title = 'MindTrack' }
  }, [display, !!timer])

  async function phaseComplete() {
    if (!timer) return
    // Play sound (non-intrusive)
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 440
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1)
      osc.start(); osc.stop(ctx.currentTime + 1)
    } catch {}

    // Show browser notification
    if (Notification.permission === 'granted') {
      new Notification(timer.phase === 'focus' ? '🎯 Focus session complete!' : '⏰ Break over!', {
        body: timer.phase === 'focus' ? 'Time to take a break.' : 'Ready to focus again?',
        tag: 'mindtrack-phase',
      })
    }

    if (timer.phase === 'focus' && timer.sessionId) {
      await finishFocus(timer.sessionId, 'completed')
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    }

    const nextRound = timer.phase === 'focus' ? timer.round + 1 : timer.round
    const nextPhase: Phase = timer.phase !== 'focus' ? 'focus' : nextRound % 4 === 0 ? 'long_break' : 'break'

    let sessionId: string | null = null
    if (nextPhase === 'focus') {
      try {
        const s = await startFocus(timer.taskId ?? undefined, focusMin)
        sessionId = (s as any)?.id ?? null
      } catch {}
    }

    const next: TimerState = {
      sessionId,
      taskId: timer.taskId,
      phase: nextPhase,
      startedAt: Date.now(),
      round: nextRound,
      paused: false,
      pausedAt: null,
      pausedElapsed: 0,
      plannedMinutes: nextPhase === 'focus' ? focusMin : nextPhase === 'long_break' ? longBreakMin : breakMin,
    }
    setTimer(next); saveState(next); setNow(Date.now())
  }

  async function handleSelectPhase(phase: Phase) {
    if (timer) {
      if (timer.sessionId && timer.phase === 'focus') {
        try { await finishFocus(timer.sessionId, 'abandoned') } catch {}
      }
      setTimer(null)
      saveState(null)
    }
    setSelectedPhase(phase)
  }

  async function handleStart() {
    let sessionId: string | null = null
    const planned = currentPhase === 'focus' ? focusMin : currentPhase === 'long_break' ? longBreakMin : breakMin
    if (currentPhase === 'focus') {
      try {
        const s = await startFocus(selectedTaskId || undefined, focusMin)
        sessionId = (s as any)?.id ?? null
      } catch {}
    }
    const t: TimerState = {
      sessionId,
      taskId: currentPhase === 'focus' ? (selectedTaskId || null) : null,
      phase: currentPhase,
      startedAt: Date.now(),
      round: timer?.round ?? 1,
      paused: false,
      pausedAt: null,
      pausedElapsed: 0,
      plannedMinutes: planned,
    }
    setTimer(t)
    saveState(t)
    setNow(Date.now())
  }

  function handlePause() {
    if (!timer) return
    const t = { ...timer, paused: true, pausedAt: Date.now(), pausedElapsed: timer.pausedElapsed + (Date.now() - timer.startedAt) }
    setTimer(t); saveState(t)
  }

  function handleResume() {
    if (!timer) return
    const t = { ...timer, paused: false, startedAt: Date.now(), pausedAt: null }
    setTimer(t); saveState(t)
  }

  async function handleStop() {
    if (!timer) return
    if (timer.sessionId && timer.phase === 'focus') {
      try { await finishFocus(timer.sessionId, 'abandoned') } catch {}
    }
    setTimer(null); saveState(null)
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const linkedTask = tasks?.find(t => t.id === timer?.taskId)

  return (
    <div className="focus-page">
      <div className="focus-container">
        {/* Interactive phase tabs */}
        <div className="focus-phase-tabs" role="tablist" aria-label="Timer modes">
          {(['focus', 'break', 'long_break'] as Phase[]).map(p => {
            const isActive = currentPhase === p
            return (
              <button
                key={p}
                type="button"
                role="tab"
                id={`focus-tab-${p}`}
                aria-selected={isActive}
                className={`focus-phase-tab ${isActive ? 'focus-phase-tab--active' : ''}`}
                onClick={() => handleSelectPhase(p)}
              >
                {p === 'focus' ? 'Focus' : p === 'break' ? 'Short Break' : 'Long Break'}
              </button>
            )
          })}
        </div>

        {/* Timer circle */}
        <div className="focus-ring-wrap" aria-label={`${display} remaining`} aria-live="polite">
          <svg className="focus-ring" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" className="focus-ring-track" />
            <circle
              cx="100" cy="100" r="90"
              className="focus-ring-progress"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - Math.min(progress / 100, 1))}`}
            />
          </svg>
          <div className="focus-time">{display}</div>
          <div className="focus-label">
            {currentPhase === 'focus' ? 'Focus' : currentPhase === 'break' ? 'Short Break' : 'Long Break'}
          </div>
          {timer && <div className="focus-round">Round {timer.round}</div>}
        </div>

        {/* Linked task */}
        {linkedTask && (
          <div className="focus-linked-task">
            <Link2 size={14} />
            <span>{linkedTask.title}</span>
          </div>
        )}

        {/* Controls */}
        <div className="focus-controls">
          {!timer ? (
            <>
              {currentPhase === 'focus' && (
                <div className="focus-task-select">
                  <label htmlFor="focus-task" className="form-label">Link a task (optional)</label>
                  <select id="focus-task" className="form-select" value={selectedTaskId} onChange={e => setSelectedTaskId(e.target.value)}>
                    <option value="">No task</option>
                    {tasks?.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
              )}
              <button id="focus-start-btn" className="btn btn--primary btn--lg focus-start-btn" onClick={handleStart}>
                <Play size={20} /> {currentPhase === 'focus' ? 'Start Focus' : currentPhase === 'break' ? 'Start Short Break' : 'Start Long Break'}
              </button>
            </>
          ) : (
            <div className="focus-btn-row">
              {timer.paused ? (
                <button id="focus-resume-btn" className="btn btn--primary btn--lg" onClick={handleResume}>
                  <Play size={20} /> Resume
                </button>
              ) : (
                <button id="focus-pause-btn" className="btn btn--ghost btn--lg" onClick={handlePause}>
                  <Pause size={20} /> Pause
                </button>
              )}
              <button id="focus-stop-btn" className="btn btn--danger btn--lg" onClick={handleStop}>
                <Square size={20} /> Stop
              </button>
            </div>
          )}
        </div>

        {/* Config hints */}
        <div className="focus-config-hint">
          {focusMin}min focus · {breakMin}min break · {longBreakMin}min long break
          <br />
          <a href="/settings" className="link">Change in settings</a>
        </div>
      </div>
    </div>
  )
}
