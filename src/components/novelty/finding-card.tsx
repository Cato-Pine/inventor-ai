'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { ConflictSelector, ConflictBadge, type ConflictLevel } from './conflict-selector'
import { NotesField } from './notes-field'
import { cn } from '@/lib/utils'

export interface FindingData {
  id: string
  title: string
  description: string
  url?: string
  source: string
  similarityScore: number
  imageUrl?: string
  price?: string
  patentNumber?: string
  filingDate?: string
  aiConflictSummary?: string
  metadata?: Record<string, string>
}

interface FindingCardProps {
  finding: FindingData
  conflictLevel: ConflictLevel
  onConflictChange: (level: ConflictLevel) => void
  notes: string
  onNotesChange: (notes: string) => void
  className?: string
}

export function FindingCard({
  finding,
  conflictLevel,
  onConflictChange,
  notes,
  onNotesChange,
  className,
}: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Image (if available) */}
          {finding.imageUrl && (
            <div className="shrink-0">
              <div className="w-20 h-20 rounded-md bg-neutral-100 overflow-hidden">
                <img
                  src={finding.imageUrl}
                  alt={finding.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-neutral-900 truncate">
                    {finding.title}
                  </h4>
                  {finding.url && (
                    <a
                      href={finding.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-neutral-600 transition-colors shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {finding.source}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(finding.similarityScore * 100)}% match
                  </Badge>
                  {finding.price && (
                    <span className="text-sm font-medium text-green-600">
                      {finding.price}
                    </span>
                  )}
                  {finding.patentNumber && (
                    <span className="text-xs text-neutral-500">
                      {finding.patentNumber}
                    </span>
                  )}
                  {finding.filingDate && (
                    <span className="text-xs text-neutral-400">
                      Filed: {finding.filingDate}
                    </span>
                  )}
                </div>
              </div>

              {/* Conflict badge on desktop */}
              <div className="hidden md:block shrink-0">
                <ConflictBadge level={conflictLevel} />
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-neutral-600 line-clamp-2">
              {finding.description}
            </p>

            {/* AI Summary (if available) */}
            {finding.aiConflictSummary && (
              <div className="mt-2 p-2 bg-neutral-50 rounded-md">
                <p className="text-xs text-neutral-500">
                  <span className="font-medium">AI Analysis:</span>{' '}
                  {finding.aiConflictSummary}
                </p>
              </div>
            )}

            {/* Expand/collapse button */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Review & add notes
                </>
              )}
            </button>

            {/* Expanded section */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-neutral-100 space-y-4">
                {/* Conflict level selector */}
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-2 block">
                    Conflict Level
                  </label>
                  <ConflictSelector
                    value={conflictLevel}
                    onChange={onConflictChange}
                  />
                </div>

                {/* Notes field */}
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-2 block">
                    Your Notes
                  </label>
                  <NotesField
                    value={notes}
                    onChange={onNotesChange}
                    placeholder="Add notes about this finding..."
                  />
                </div>

                {/* Additional metadata */}
                {finding.metadata && Object.keys(finding.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Additional Details
                    </label>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(finding.metadata).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-neutral-400 capitalize">{key.replace(/_/g, ' ')}</dt>
                          <dd className="text-neutral-700">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
