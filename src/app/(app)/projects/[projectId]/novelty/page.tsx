import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Project } from '@/types/database'
import type { PostgrestError } from '@supabase/supabase-js'
import { NoveltyCheckClient } from './novelty-check-client'

interface NoveltyPageProps {
  params: Promise<{ projectId: string }>
}

export default async function NoveltyPage({ params }: NoveltyPageProps) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single() as { data: Project | null; error: PostgrestError | null }

  if (error || !project) {
    notFound()
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Novelty Check" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Back link */}
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Project
        </Link>

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-neutral-900">
                Novelty Check
              </h1>
              <Badge variant="secondary">{project.name}</Badge>
            </div>
            <p className="text-neutral-500 max-w-2xl">
              Search for existing patents, products, and similar inventions to
              assess the novelty of your idea. Review each finding and mark the
              conflict level.
            </p>
          </div>
        </div>

        {/* Client component for interactive novelty check */}
        <NoveltyCheckClient
          projectId={projectId}
          inventionName={project.name}
          description={project.description || ''}
          problemStatement={project.problem_statement || undefined}
          targetAudience={project.target_audience || undefined}
        />
      </div>
    </div>
  )
}
