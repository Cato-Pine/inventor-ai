'use client'

import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StepStatus = 'completed' | 'in_progress' | 'pending'

export interface Step {
  id: string
  label: string
  status: StepStatus
}

interface ProgressStepperProps {
  steps: Step[]
  className?: string
}

export function ProgressStepper({ steps, className }: ProgressStepperProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step node */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center transition-colors',
                  step.status === 'completed' && 'bg-green-100 text-green-600',
                  step.status === 'in_progress' && 'bg-neutral-900 text-white',
                  step.status === 'pending' && 'bg-neutral-100 text-neutral-400'
                )}
              >
                {step.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : step.status === 'in_progress' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-sm font-medium text-center max-w-24',
                  step.status === 'completed' && 'text-green-600',
                  step.status === 'in_progress' && 'text-neutral-900',
                  step.status === 'pending' && 'text-neutral-400'
                )}
              >
                {step.label}
              </span>
              <span
                className={cn(
                  'text-xs',
                  step.status === 'completed' && 'text-green-500',
                  step.status === 'in_progress' && 'text-neutral-500',
                  step.status === 'pending' && 'text-neutral-300'
                )}
              >
                {step.status === 'completed'
                  ? 'Complete'
                  : step.status === 'in_progress'
                  ? 'In Progress'
                  : 'Pending'}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-4 transition-colors',
                  step.status === 'completed' ? 'bg-green-300' : 'bg-neutral-200'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
