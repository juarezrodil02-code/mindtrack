import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCourses, useCreateCourse, useUpdateCourse, useArchiveCourse } from './hooks'
import { fetchClassMeetings, createClassMeeting, updateClassMeeting, deleteClassMeeting } from '@/lib/api'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CourseCreateSchema, ClassMeetingCreateSchema, WEEKDAY_FULL_LABELS } from '@mindtrack/shared'
import type { CourseCreate, ClassMeetingCreate } from '@mindtrack/shared'
import { Plus, Edit2, Archive, X, GraduationCap, Clock, AlertTriangle, Trash2 } from 'lucide-react'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b','#10b981','#06b6d4','#3b82f6']

export function CoursesPage() {
  const { data: courses, isLoading, error } = useCourses()
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [courseModal, setCourseModal] = useState<{ mode: 'create' | 'edit', id?: string } | null>(null)
  const [meetingModal, setMeetingModal] = useState<{ courseId: string, meetingId?: string } | null>(null)
  const archiveCourse = useArchiveCourse()

  const { data: meetings } = useQuery({
    queryKey: ['class_meetings', selectedCourse],
    queryFn: () => fetchClassMeetings(selectedCourse ?? undefined),
    enabled: !!selectedCourse,
  })
  const qc = useQueryClient()
  const deleteMeeting = useMutation({
    mutationFn: deleteClassMeeting,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class_meetings'] }),
  })

  if (isLoading) return <div className="page-loading"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Courses</h1>
        <button id="create-course-btn" className="btn btn--primary" onClick={() => setCourseModal({ mode: 'create' })}>
          <Plus size={16} /> New Course
        </button>
      </div>

      {!courses?.length ? (
        <div className="empty-state empty-state--center">
          <GraduationCap size={48} className="empty-icon" />
          <p className="empty-title">No courses yet</p>
          <p className="empty-text">Add your courses to organize tasks and get class reminders</p>
          <button className="btn btn--primary" onClick={() => setCourseModal({ mode: 'create' })}>
            <Plus size={16} /> Add course
          </button>
        </div>
      ) : (
        <div className="courses-layout">
          {/* Course list */}
          <div className="course-list">
            {courses.map(c => (
              <div
                key={c.id}
                className={`course-card ${selectedCourse === c.id ? 'course-card--selected' : ''}`}
                onClick={() => setSelectedCourse(selectedCourse === c.id ? null : c.id)}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelectedCourse(selectedCourse === c.id ? null : c.id)}
              >
                <div className="course-color-dot" style={{ background: c.color }} />
                <div className="course-info">
                  <p className="course-name">{c.name}</p>
                  <p className="course-meta">{c.code && <span className="course-code">{c.code}</span>}{c.term && <span className="course-term">{c.term}</span>}</p>
                </div>
                <div className="course-actions">
                  <button className="icon-btn" onClick={e => { e.stopPropagation(); setCourseModal({ mode: 'edit', id: c.id }) }} aria-label={`Edit ${c.name}`}><Edit2 size={14} /></button>
                  <button className="icon-btn" onClick={e => { e.stopPropagation(); if (confirm(`Archive "${c.name}"?`)) archiveCourse.mutate(c.id) }} aria-label={`Archive ${c.name}`}><Archive size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Class meetings panel */}
          {selectedCourse && (
            <div className="meetings-panel">
              <div className="meetings-header">
                <h2 className="section-title">Class Schedule</h2>
                <button
                  id="add-meeting-btn"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setMeetingModal({ courseId: selectedCourse })}
                >
                  <Plus size={14} /> Add class time
                </button>
              </div>

              {!meetings?.length ? (
                <div className="empty-state">
                  <Clock size={32} className="empty-icon" />
                  <p className="empty-text">No class times yet</p>
                </div>
              ) : (
                <div className="meeting-list">
                  {meetings.map(m => (
                    <div key={m.id} className="meeting-card">
                      <div className="meeting-day">{WEEKDAY_FULL_LABELS[m.weekday]}</div>
                      <div className="meeting-time">{m.start_time.slice(0, 5)} – {m.end_time.slice(0, 5)}</div>
                      {m.location && <div className="meeting-location">{m.location}</div>}
                      {m.remind_minutes_before && <div className="meeting-remind">⏰ {m.remind_minutes_before} min before</div>}
                      <div className="meeting-actions">
                        <button className="icon-btn" onClick={() => setMeetingModal({ courseId: selectedCourse, meetingId: m.id })} aria-label="Edit"><Edit2 size={13} /></button>
                        <button className="icon-btn icon-btn--danger" onClick={() => { if (confirm('Remove this class time?')) deleteMeeting.mutate(m.id) }} aria-label="Delete"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {courseModal && (
        <CourseFormModal
          mode={courseModal.mode}
          courseId={courseModal.id}
          courses={courses ?? []}
          onClose={() => setCourseModal(null)}
        />
      )}
      {meetingModal && (
        <MeetingFormModal
          courseId={meetingModal.courseId}
          meetingId={meetingModal.meetingId}
          onClose={() => setMeetingModal(null)}
        />
      )}
    </div>
  )
}

function CourseFormModal({ mode, courseId, courses, onClose }: {
  mode: 'create' | 'edit'; courseId?: string; courses: any[]; onClose: () => void
}) {
  const existing = courses.find(c => c.id === courseId)
  const create = useCreateCourse()
  const update = useUpdateCourse()
  const [color, setColor] = useState(existing?.color ?? '#6366f1')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CourseCreate>({
    resolver: zodResolver(CourseCreateSchema),
    defaultValues: existing ? { name: existing.name, code: existing.code ?? '', color: existing.color, term: existing.term ?? '' } : { color: '#6366f1' },
  })

  async function onSubmit(values: CourseCreate) {
    if (mode === 'edit' && courseId) {
      await update.mutateAsync({ id: courseId, ...values, color })
    } else {
      await create.mutateAsync({ ...values, color })
    }
    onClose()
  }

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <div className="dialog">
        <div className="dialog-header">
          <h2 className="dialog-title">{mode === 'create' ? 'New Course' : 'Edit Course'}</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="task-form" noValidate>
          <div className="form-group">
            <label htmlFor="cf-name" className="form-label">Course name *</label>
            <input id="cf-name" type="text" className={`form-input ${errors.name ? 'form-input--error' : ''}`} placeholder="e.g. Linear Algebra" {...register('name')} autoFocus />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cf-code" className="form-label">Course code</label>
              <input id="cf-code" type="text" className="form-input" placeholder="e.g. MATH101" {...register('code')} />
            </div>
            <div className="form-group">
              <label htmlFor="cf-term" className="form-label">Term</label>
              <input id="cf-term" type="text" className="form-input" placeholder="e.g. Fall 2026" {...register('term')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-palette">
              {COLORS.map(c => (
                <button key={c} type="button" className={`color-swatch ${color === c ? 'color-swatch--active' : ''}`}
                  style={{ background: c }} onClick={() => setColor(c)} aria-label={`Color ${c}`} />
              ))}
            </div>
          </div>
          <div className="dialog-footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button id="cf-submit" type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create course' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MeetingFormModal({ courseId, meetingId, onClose }: {
  courseId: string; meetingId?: string; onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ClassMeetingCreate>({
    resolver: zodResolver(ClassMeetingCreateSchema),
    defaultValues: { course_id: courseId, weekday: 1, start_time: '09:00', end_time: '10:00' },
  })

  async function onSubmit(values: ClassMeetingCreate) {
    await createClassMeeting(values)
    qc.invalidateQueries({ queryKey: ['class_meetings'] })
    onClose()
  }

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <div className="dialog">
        <div className="dialog-header">
          <h2 className="dialog-title">Add Class Time</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="task-form" noValidate>
          <div className="form-group">
            <label htmlFor="mf-day" className="form-label">Day</label>
            <select id="mf-day" className="form-select" {...register('weekday', { valueAsNumber: true })}>
              {WEEKDAY_FULL_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="mf-start" className="form-label">Start time</label>
              <input id="mf-start" type="time" className="form-input" {...register('start_time')} />
            </div>
            <div className="form-group">
              <label htmlFor="mf-end" className="form-label">End time</label>
              <input id="mf-end" type="time" className="form-input" {...register('end_time')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="mf-loc" className="form-label">Location</label>
              <input id="mf-loc" type="text" className="form-input" placeholder="e.g. Room 204" {...register('location')} />
            </div>
            <div className="form-group">
              <label htmlFor="mf-remind" className="form-label">Remind (min before)</label>
              <input id="mf-remind" type="number" min={1} max={1440} className="form-input"
                placeholder="e.g. 15" {...register('remind_minutes_before', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="dialog-footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button id="mf-submit" type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Add class time'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
