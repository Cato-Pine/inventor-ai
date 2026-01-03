'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { MessageSquare, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotesFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function NotesField({
  value,
  onChange,
  placeholder = 'Add your notes...',
  className,
}: NotesFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const handleSave = () => {
    onChange(draft)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDraft(value)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value)
          setIsEditing(true)
        }}
        className={cn(
          'w-full text-left px-3 py-2 rounded-md border border-dashed border-neutral-200',
          'hover:border-neutral-300 hover:bg-neutral-50 transition-colors',
          'text-sm',
          value ? 'text-neutral-700' : 'text-neutral-400',
          className
        )}
      >
        <div className="flex items-start gap-2">
          <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{value || placeholder}</span>
        </div>
      </button>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="min-h-20 text-sm"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
        >
          <Check className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>
    </div>
  )
}
