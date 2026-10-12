import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCourses, createCourse, updateCourse, archiveCourse } from '@/lib/api'
import type { Database } from '@mindtrack/shared'

type CourseInsert = Database['public']['Tables']['courses']['Insert']
type CourseUpdate = Database['public']['Tables']['courses']['Update']

export const courseKeys = {
  all: ['courses'] as const,
  list: () => [...courseKeys.all, 'list'] as const,
}

export function useCourses() {
  return useQuery({
    queryKey: courseKeys.list(),
    queryFn: fetchCourses,
    staleTime: 5 * 60_000,
  })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (course: CourseInsert) => createCourse(course),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  })
}

export function useUpdateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...course }: CourseUpdate & { id: string }) => updateCourse(id, course),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  })
}

export function useArchiveCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: archiveCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  })
}
