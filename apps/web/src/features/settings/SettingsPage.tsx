import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/app/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Moon, Timer, Save, CheckCircle, AlertTriangle, Globe, XCircle } from 'lucide-react'

interface SettingsFormValues {
  name: string
  timezone: string
  quiet_start: string
  quiet_end: string
  focus_minutes: number
  break_minutes: number
  long_break_minutes: number
}

const COMMON_TIMEZONES = [
  { value: 'Asia/Manila', label: 'Asia/Manila (Philippines - GMT+8) 🇵🇭' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (Singapore - GMT+8)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (Hong Kong - GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (Japan - GMT+9)' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (Korea - GMT+9)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (Thailand / Jakarta - GMT+7)' },
  { value: 'Asia/Taipei', label: 'Asia/Taipei (Taiwan - GMT+8)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UAE - GMT+4)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (Sydney - GMT+10)' },
  { value: 'Europe/London', label: 'Europe/London (London - GMT+0)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (Paris - GMT+1)' },
  { value: 'America/New_York', label: 'America/New_York (Eastern - GMT-5)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central - GMT-6)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain - GMT-7)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific - GMT-8)' },
  { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
]

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [saved, setSaved] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<SettingsFormValues>({
    defaultValues: {
      name: profile?.name ?? '',
      timezone: profile?.timezone || 'Asia/Manila',
      quiet_start: profile?.quiet_start ? profile.quiet_start.slice(0, 5) : '',
      quiet_end: profile?.quiet_end ? profile.quiet_end.slice(0, 5) : '',
      focus_minutes: profile?.focus_minutes ?? 25,
      break_minutes: profile?.break_minutes ?? 5,
      long_break_minutes: profile?.long_break_minutes ?? 15,
    },
  })

  // Watch current timezone to display dynamic feedback
  const currentTimezone = watch('timezone')

  // When profile loads or changes, populate form values
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name ?? '',
        timezone: profile.timezone || 'Asia/Manila',
        quiet_start: profile.quiet_start ? profile.quiet_start.slice(0, 5) : '',
        quiet_end: profile.quiet_end ? profile.quiet_end.slice(0, 5) : '',
        focus_minutes: profile.focus_minutes ?? 25,
        break_minutes: profile.break_minutes ?? 5,
        long_break_minutes: profile.long_break_minutes ?? 15,
      })
    }
  }, [profile, reset])

  async function onSave(values: SettingsFormValues) {
    setErrorMessage(null)
    setSaveSuccessMessage(null)

    const targetId = profile?.id || user?.id
    if (!targetId) {
      setErrorMessage('User session not found. Please log in again.')
      return
    }

    const qStart = values.quiet_start?.trim() || null
    const qEnd = values.quiet_end?.trim() || null

    // Postgres constraint quiet_both_or_neither: both must be set or both null
    if ((qStart && !qEnd) || (!qStart && qEnd)) {
      setErrorMessage('Quiet hours require both a Start time and End time. Leave both empty to disable.')
      return
    }

    const focusMin = Math.max(1, Math.min(120, Number(values.focus_minutes) || 25))
    const breakMin = Math.max(1, Math.min(60, Number(values.break_minutes) || 5))
    const longBreakMin = Math.max(1, Math.min(120, Number(values.long_break_minutes) || 15))

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: targetId,
        name: values.name?.trim() || null,
        timezone: values.timezone || 'Asia/Manila',
        quiet_start: qStart,
        quiet_end: qEnd,
        focus_minutes: focusMin,
        break_minutes: breakMin,
        long_break_minutes: longBreakMin,
      })

      if (error) {
        setErrorMessage(error.message || 'Failed to save settings.')
        return
      }

      await refreshProfile()
      setSaved(true)
      setSaveSuccessMessage('Settings saved successfully! Timezone and preferences are now active.')
      setTimeout(() => {
        setSaved(false)
        setSaveSuccessMessage(null)
      }, 4000)
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while saving.')
    }
  }

  function clearQuietHours() {
    setValue('quiet_start', '')
    setValue('quiet_end', '')
  }

  // Ensure current timezone exists in the options list if custom
  const isCustomTz = currentTimezone && !COMMON_TIMEZONES.some(tz => tz.value === currentTimezone)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-grid">
        <form onSubmit={handleSubmit(onSave)} className="settings-form" noValidate>
          {errorMessage && (
            <div className="alert alert--danger">
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccessMessage && (
            <div className="alert alert--success">
              <CheckCircle size={18} />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* Profile */}
          <section className="settings-section">
            <h2 className="settings-section-title">Profile</h2>
            <div className="form-group">
              <label htmlFor="s-name" className="form-label">Name</label>
              <input
                id="s-name"
                type="text"
                className="form-input"
                placeholder="Enter your name"
                {...register('name')}
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label htmlFor="s-tz" className="form-label">
                <Globe size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                Timezone
              </label>

              <select id="s-tz" className="form-select" {...register('timezone')}>
                {isCustomTz && (
                  <option value={currentTimezone}>{currentTimezone} (Custom)</option>
                )}
                {COMMON_TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>

              <div className="settings-action-row">
                <p className="form-hint">
                  {currentTimezone === 'Asia/Manila' ? (
                    <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>
                      ✓ Active: Philippine Standard Time (PHT, UTC+08:00)
                    </span>
                  ) : (
                    <span>Currently selected: <strong>{currentTimezone}</strong></span>
                  )}
                </p>
                <p className="form-hint">
                  Browser: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>
            </div>
          </section>

          {/* Quiet hours */}
          <section className="settings-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="settings-section-title" style={{ margin: 0 }}>
                <Moon size={16} /> Quiet Hours
              </h2>
              <button
                type="button"
                className="btn btn--xs btn--ghost"
                onClick={clearQuietHours}
                title="Disable quiet hours"
              >
                <XCircle size={13} style={{ marginRight: '4px' }} /> Clear quiet hours
              </button>
            </div>
            <p className="settings-desc" style={{ marginTop: '8px' }}>
              Reminders during this window will be held until it ends. Set both Start and End, or leave both empty to disable.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="s-quiet-start" className="form-label">Start</label>
                <input id="s-quiet-start" type="time" className="form-input" {...register('quiet_start')} />
              </div>
              <div className="form-group">
                <label htmlFor="s-quiet-end" className="form-label">End</label>
                <input id="s-quiet-end" type="time" className="form-input" {...register('quiet_end')} />
              </div>
            </div>
          </section>

          {/* Timer settings */}
          <section className="settings-section">
            <h2 className="settings-section-title">
              <Timer size={16} /> Focus Timer
            </h2>
            <div className="form-row form-row--3">
              <div className="form-group">
                <label htmlFor="s-focus" className="form-label">Focus (min)</label>
                <input
                  id="s-focus"
                  type="number"
                  min={1}
                  max={120}
                  className="form-input"
                  {...register('focus_minutes', { valueAsNumber: true })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="s-break" className="form-label">Break (min)</label>
                <input
                  id="s-break"
                  type="number"
                  min={1}
                  max={60}
                  className="form-input"
                  {...register('break_minutes', { valueAsNumber: true })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="s-long" className="form-label">Long break (min)</label>
                <input
                  id="s-long"
                  type="number"
                  min={1}
                  max={120}
                  className="form-input"
                  {...register('long_break_minutes', { valueAsNumber: true })}
                />
              </div>
            </div>
          </section>

          <div className="settings-footer">
            <button
              id="settings-save-btn"
              type="submit"
              className={`btn btn--primary ${saved ? 'btn--success' : ''}`}
              disabled={isSubmitting}
            >
              {saved ? (
                <>
                  <CheckCircle size={16} /> Saved!
                </>
              ) : isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <Save size={16} /> Save settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
