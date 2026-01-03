'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, CheckCircle, AlertCircle, Package } from 'lucide-react'
import { FindingCard, type FindingData } from './finding-card'
import type { ConflictLevel } from './conflict-selector'
import { cn } from '@/lib/utils'

export interface RetailFinding extends FindingData {
  price?: string
  imageUrl?: string
  retailer?: string
}

interface RetailResultsProps {
  findings: RetailFinding[]
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

export function RetailResults({
  findings,
  summary,
  isNovel,
  className,
}: RetailResultsProps) {
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

  // Calculate price range if available
  const prices = findings
    .filter((f) => f.price)
    .map((f) => {
      const match = f.price?.match(/[\d.]+/)
      return match ? parseFloat(match[0]) : null
    })
    .filter((p): p is number => p !== null)

  const priceRange =
    prices.length > 0
      ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
        }
      : null

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
              <ShoppingCart
                className={cn(
                  'h-5 w-5',
                  isNovel ? 'text-green-600' : 'text-amber-600'
                )}
              />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Retail Availability
                {isNovel ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
              </CardTitle>
              <CardDescription className="mt-1">{summary}</CardDescription>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
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
            {priceRange && (
              <Badge variant="secondary" className="text-green-700">
                ${priceRange.min.toFixed(0)} - ${priceRange.max.toFixed(0)}
              </Badge>
            )}
            <Badge variant="outline">{findings.length} products</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {findings.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-8 w-8 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600">No similar retail products found</p>
            <p className="text-sm text-neutral-400 mt-1">
              This could indicate a market opportunity
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {findings.map((finding) => (
              <div key={finding.id} className="p-4">
                <FindingCard
                  finding={{
                    ...finding,
                    source: finding.retailer || finding.source || 'Retail',
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

        {/* Market insight */}
        {findings.length > 0 && priceRange && (
          <div className="p-4 bg-neutral-50 border-t border-neutral-100">
            <div className="flex gap-2 text-sm text-neutral-600">
              <Package className="h-4 w-4 shrink-0 mt-0.5 text-neutral-400" />
              <p>
                <span className="font-medium">Market Insight:</span> Similar
                products are priced between ${priceRange.min.toFixed(2)} and $
                {priceRange.max.toFixed(2)}. Consider this range when pricing
                your invention.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
