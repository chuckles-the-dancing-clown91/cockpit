import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/core/components/ui/Card';
import { useArticleIdeas, type ArticleIdea } from '../../../hooks/queries';
import { toast } from '@/core/lib/toast';
import WritingStats from './WritingStats';
import { IdeasSidebar } from './IdeasSidebar';
import { TipTapEditor } from './TipTapEditor';
import { RightSidebar } from './RightSidebar';

export default function EditorView() {
  const [selectedIdeaId, setSelectedIdeaId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { data: ideas = [] } = useArticleIdeas({});

  const selectedIdea = useMemo(() => ideas.find((idea) => idea.id === selectedIdeaId) ?? ideas[0], [ideas, selectedIdeaId]);

  const [articleContent, setArticleContent] = useState('');
  const [articleTitle, setArticleTitle] = useState('');

  // Mock references - replace with actual API call
  const mockReferences = [
    {
      id: 1,
      type: 'article' as const,
      title: 'Sample Reference Article',
      url: 'https://example.com/article',
      sourceId: 1,
      addedAt: new Date().toISOString(),
      notes: 'This is a sample reference note with some details about the article.',
    },
  ];

  // Sync article content when idea changes
  useEffect(() => {
    if (!selectedIdea) return;
    setSelectedIdeaId(selectedIdea.id);
    setArticleContent(selectedIdea.articleMarkdown ?? '');
    setArticleTitle(selectedIdea.articleTitle ?? '');
  }, [selectedIdea?.id]);

  // Auto-save article content
  useEffect(() => {
    if (!selectedIdea) return;
    if (articleContent === (selectedIdea.articleMarkdown ?? '')) return;
    
    const timer = setTimeout(async () => {
      try {
        await invoke('update_idea_article', { 
          id: selectedIdea.id, 
          input: { article_markdown: articleContent } 
        });
        // Update cache
        queryClient.setQueriesData({ queryKey: ['articleIdeas'] }, (prev?: ArticleIdea[]) =>
          prev?.map((idea) => 
            idea.id === selectedIdea.id ? { ...idea, articleMarkdown: articleContent } : idea
          ) ?? prev
        );
      } catch (err) {
        console.error('Failed to save article draft', err);
      }
    }, 600);
    
    return () => clearTimeout(timer);
  }, [articleContent, selectedIdea?.id, queryClient]);

  // Auto-save article title
  useEffect(() => {
    if (!selectedIdea) return;
    if (articleTitle === (selectedIdea.articleTitle ?? '')) return;
    
    const timer = setTimeout(async () => {
      try {
        await invoke('update_idea_article', { 
          id: selectedIdea.id, 
          input: { article_title: articleTitle } 
        });
        queryClient.setQueriesData({ queryKey: ['articleIdeas'] }, (prev?: ArticleIdea[]) =>
          prev?.map((idea) => 
            idea.id === selectedIdea.id ? { ...idea, articleTitle } : idea
          ) ?? prev
        );
      } catch (err) {
        console.error('Failed to save article title', err);
      }
    }, 600);
    
    return () => clearTimeout(timer);
  }, [articleTitle, selectedIdea?.id, queryClient]);

  const handleUpdateNotes = async (notes: string) => {
    if (!selectedIdea) return;
    try {
      await invoke('update_idea_notes', {
        id: selectedIdea.id,
        notesMarkdown: notes,
      });
      queryClient.invalidateQueries({ queryKey: ['articleIdeas'] });
      toast.success('Notes updated');
    } catch (err) {
      toast.error('Failed to update notes');
      console.error(err);
    }
  };

  const statusLabel = (status?: ArticleIdea['status']) => {
    switch (status) {
      case 'in_progress': return 'In progress';
      case 'stalled': return 'Stalled';
      case 'complete': return 'Complete';
      default: return 'Unknown';
    }
  };
  
  const priorityLabel = (priority?: number) => {
    switch (priority) {
      case 2: return 'High';
      case 0: return 'Low';
      default: return 'Normal';
    }
  };

  return (
    <div className="flex gap-2 p-2 h-full min-h-0">
      {/* Ideas Sidebar with HoverCards */}
      <div className="w-[280px] flex-shrink-0">
        <IdeasSidebar 
          selectedIdeaId={selectedIdeaId} 
          onSelectIdea={setSelectedIdeaId} 
        />
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col gap-2 h-full min-h-0">
        <Card className="flex flex-col gap-3 p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--color-text-soft)]">
              Idea: {selectedIdea?.title || 'No idea selected'}
            </h3>
            {selectedIdea && (
              <div className="flex items-center gap-3 text-xs text-[var(--color-text-soft)]">
                <span>
                  Status: <span className="font-medium text-[var(--color-text-primary)]">
                    {statusLabel(selectedIdea.status)}
                  </span>
                </span>
                <span>•</span>
                <span>
                  Priority: <span className="font-medium text-[var(--color-text-primary)]">
                    {priorityLabel(selectedIdea.priority)}
                  </span>
                </span>
              </div>
            )}
          </div>
          {selectedIdea && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-1">
                Article Title
              </label>
              <input
                type="text"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
                placeholder="Enter article title for publishing..."
                className="w-full px-3 py-2 text-lg font-semibold border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          )}
        </Card>
        
        <div className="flex-shrink-0">
          <WritingStats content={articleContent} />
        </div>
        
        <div className="flex-1 min-h-0">
          {selectedIdea ? (
            <TipTapEditor
              value={articleContent}
              onChange={setArticleContent}
              placeholder="Start writing your article..."
            />
          ) : (
            <Card className="flex items-center justify-center h-full">
              <p className="text-[var(--color-text-muted)]">
                Select or create an idea to start writing
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Right Sidebar - Notes & References */}
      <div className="w-[340px] flex-shrink-0">
        <RightSidebar
          idea={selectedIdea || null}
          references={mockReferences}
          onUpdateNotes={handleUpdateNotes}
        />
      </div>
    </div>
  );
}
