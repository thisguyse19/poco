import type { Task } from '../types'

/** Merge new category text with an existing task category when case-insensitive match. */
export function canonicalCategoryName(input: string, tasks: Task[]): string {
  const t = input.replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || 'General'
  const low = t.toLowerCase()
  const seen = new Set<string>()
  for (const task of tasks) {
    const c = task.category?.trim() || 'General'
    if (seen.has(c)) continue
    seen.add(c)
    if (c.toLowerCase() === low) return c
  }
  return t
}

export function canonicalCategoryFromList(input: string, existing: readonly string[]): string {
  const t = input.replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || 'General'
  const low = t.toLowerCase()
  for (const c of existing) {
    const cc = c.trim() || 'General'
    if (cc.toLowerCase() === low) return cc
  }
  return t
}
