import { describe, it, expect } from 'vitest'
import {
  TaskCreateSchema,
  CourseCreateSchema,
  ProfileUpdateSchema,
} from '@mindtrack/shared'

describe('Schema Validations', () => {
  it('validates a correct task payload', () => {
    const payload = {
      title: 'Math Homework 4',
      type: 'assignment',
      priority: 'high',
      due_at: '2026-10-20T23:59:00Z',
      estimated_minutes: 60,
    }
    const result = TaskCreateSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('fails validation when task title is empty', () => {
    const payload = {
      title: '',
      type: 'assignment',
    }
    const result = TaskCreateSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('validates course creation with valid hex color', () => {
    const payload = {
      name: 'Introduction to Computer Science',
      code: 'CS101',
      color: '#6366f1',
    }
    const result = CourseCreateSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('rejects invalid hex color in course creation', () => {
    const payload = {
      name: 'Physics',
      color: 'red', // Not a 6-digit hex code
    }
    const result = CourseCreateSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('validates profile updates with quiet hours', () => {
    const payload = {
      name: 'Alex Student',
      quiet_start: '22:00',
      quiet_end: '07:00',
      focus_minutes: 25,
      break_minutes: 5,
    }
    const result = ProfileUpdateSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('rejects invalid quiet hour time format', () => {
    const payload = {
      quiet_start: '10pm', // Invalid format, expects HH:mm
    }
    const result = ProfileUpdateSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })
})
