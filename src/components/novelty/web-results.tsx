'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, CheckCircle, AlertCircle, Search } from 'lucide-react'
import { FindingCard, type FindingData } from './finding-card'
import type { ConflictLevel } from './conflict-selector'
import { cn } from '@/lib/utils'

export interface WebFinding extends FindingData {
  imageUrl?: string
}

interface WebResultsProps {
  findings: WebFinding[]
  summary: string
  isNovel: boolean
  className?: string
}

interface FindingState {
  conflictLevel: ConflictLevel
  notes: string
}

function getInitialConflictLevel(similarity: number): ConflictLevel {
  if (similarity >= 0.7) return 'high'
  if (similarity >= 0.4) return 'medium'
  return 'low'
}

export function WebResults({
  findings,
  summary,
  isNovel,
  className,
}: WebResultsProps) {
  const [findingStates, setFindingStates] = useState<Record<string, FindingState>>(() => {
    const initial: Record<string, FindingState> = {}
    findings.forEach((finding) => {
      initial[finding.id] = {
        conflictLevel: getInitialConflictLevel(finding.similarityScore),
        notes: '',
      }
    })
    return initial
  })

  const updateFindingState = (id: string, updates: Partial<FindingState>) => {
    setFindingStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }))
  }

  const highConflictCount = Object.values(findingStates).filter(
    (s) => s.conflictLevel === 'high'
  ).length
  const mediumConflictCount = Object.values(findingStates).filter(
    (s) => s.conflictLevel === 'medium'
  ).length

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="border-b border-neutral-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                isNovel ? 'bg-green-100' : 'bg-amber-100'
              )}
            >
              <Globe
                className={cn(
                  'h-5 w-5',
                  isNovel ? 'text-green-600' : 'text-amber-600'
                )}
              />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Web Search Results
                {isNovel ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
              </CardTitle>
              <CardDescription className="mt-1">{summary}</CardDescription>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {highConflictCount > 0 && (
              <Badge className="bg-red-100 text-red-700 border-0">
                {highConflictCount} High
              </Badge>
            )}
            {mediumConflictCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-0">
                {mediumConflictCount} Medium
              </Badge>
            )}
            <Badge variant="outline">{findings.length} results</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {findings.length === 0 ? (
          <div className="p-8 text-center">
            <Search className="h-8 w-8 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600">No similar products or ideas found</p>
            <p className="text-sm text-neutral-400 mt-1">
              The web search found no significant matches
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {findings.map((finding) => (
              <div key={finding.id} className="p-4">
                <FindingCard
                  finding={{
                    ...finding,
                    source: finding.source || 'Web Search',
                  }}
                  conflictLevel={findingStates[finding.id]?.conflictLevel || 'low'}
                  onConflictChange={(level) =>
                    updateFindingState(finding.id, { conflictLevel: level })
                  }
                  notes={findingStates[finding.id]?.notes || ''}
                  onNotesChange={(notes) =>
                    updateFindingState(finding.id, { notes })
                  }
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
