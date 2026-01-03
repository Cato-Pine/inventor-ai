'use client'

import { cn } from '@/lib/utils'

export type ConflictLevel = 'high' | 'medium' | 'low'

interface ConflictSelectorProps {
  value: ConflictLevel
  onChange: (level: ConflictLevel) => void
  disabled?: boolean
  className?: string
}

const conflictLevels: { value: ConflictLevel; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-50' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-50' },
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-50' },
]

export function ConflictSelector({
  value,
  onChange,
  disabled = false,
  className,
}: ConflictSelectorProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {conflictLevels.map((level) => (
        <button
          key={level.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(level.value)}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-md border transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            value === level.value
              ? level.color
              : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100'
          )}
        >
          {level.label}
        </button>
      ))}
    </div>
  )
}

export function ConflictBadge({
  level,
  className,
}: {
  level: ConflictLevel
  className?: string
}) {
  const config = conflictLevels.find((l) => l.value === level)
  if (!config) return null

  return (
    <span
      className={cn(
        'px-2.5 py-0.5 text-xs font-medium rounded-full',
        level === 'high' && 'bg-red-100 text-red-700',
        level === 'medium' && 'bg-amber-100 text-amber-700',
        level === 'low' && 'bg-green-100 text-green-700',
        className
      )}
    >
      {config.label} Conflict
    </span>
  )
}
