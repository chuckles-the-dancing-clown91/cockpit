import { Flex, Text, Button, Badge, Card, TextField, TextArea } from '@radix-ui/themes';
import { Plus, ExternalLink, Trash2, FileText, Book } from 'lucide-react';
import { useState } from 'react';
import { useIdeaReferences, useAddReference, useRemoveReference } from '../hooks/useReferences';
import { NoteHoverPreview, ReferenceNotesDialog } from '@/features/notes';
import { ReaderCockpitDialog } from '@/features/research/readerCockpit';

interface ReferencesPanelProps {
  ideaId: number;
}

/**
 * ReferencesPanel - Displays and manages references for an idea
 * 
 * Features:
 * - List all references for an idea
 * - Add new manual references (URL-based)
 * - Remove references
 * - Open references in webview with eye icon
 * - Coming soon: Select from news articles
 */
export function ReferencesPanel({ ideaId }: ReferencesPanelProps) {
  const { data: references = [], isLoading } = useIdeaReferences(ideaId);
  const addReference = useAddReference();
  const removeReference = useRemoveReference();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRefUrl, setNewRefUrl] = useState('');
  const [newRefTitle, setNewRefTitle] = useState('');
  const [newRefDescription, setNewRefDescription] = useState('');
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesReferenceId, setNotesReferenceId] = useState<number | null>(null);
  const [notesReferenceTitle, setNotesReferenceTitle] = useState('');
  const [readerCockpitOpen, setReaderCockpitOpen] = useState(false);
  const [readerReferenceId, setReaderReferenceId] = useState<number | null>(null);
  
  const handleAddReference = async () => {
    if (!newRefUrl.trim()) return;
    
    await addReference.mutateAsync({
      ideaId,
      referenceType: 'url',
      url: newRefUrl,
      title: newRefTitle || undefined,
      description: newRefDescription || undefined,
    });
    
    setNewRefUrl('');
    setNewRefTitle('');
    setNewRefDescription('');
    setShowAddDialog(false);
  };
  
  if (isLoading) {
    return <Text>Loading references...</Text>;
  }
  
  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Text size="4" weight="medium">
          References ({references.length})
        </Text>
        <Button onClick={() => setShowAddDialog(true)} size="2">
          <Plus className="w-4 h-4" />
          Add Reference
        </Button>
      </Flex>
      
      {showAddDialog && (
        <Card>
          <Flex direction="column" gap="3">
            <Flex justify="between" align="center">
              <Text size="3" weight="medium">Add New Reference</Text>
              <Badge color="orange" size="1">Coming Soon: Select from Articles</Badge>
            </Flex>
            <Text size="1" style={{ color: 'var(--color-text-muted)' }}>
              Add a manual reference URL, or select from your news articles (coming soon)
            </Text>
            <TextField.Root
              placeholder="URL *"
              value={newRefUrl}
              onChange={(e) => setNewRefUrl(e.target.value)}
            />
            <TextField.Root
              placeholder="Title (optional)"
              value={newRefTitle}
              onChange={(e) => setNewRefTitle(e.target.value)}
            />
            <TextArea
              placeholder="Description (optional)"
              value={newRefDescription}
              onChange={(e) => setNewRefDescription(e.target.value)}
              rows={2}
            />
            <Flex gap="2" justify="end">
              <Button variant="soft" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddReference} disabled={!newRefUrl.trim()}>
                Add
              </Button>
            </Flex>
          </Flex>
        </Card>
      )}
      
      {references.length === 0 ? (
        <Card>
          <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
            No references yet. Add URLs, articles, or other resources to support this idea.
          </Text>
        </Card>
      ) : (
        <Flex direction="column" gap="2">
          {references.map((ref) => (
            <Card key={ref.id}>
              <Flex justify="between" align="start" gap="3">
                <Flex direction="column" gap="2" style={{ flex: 1 }}>
                  {ref.title && (
                    <NoteHoverPreview
                      entityType="reference"
                      entityId={ref.id}
                      noteType="main"
                    >
                      <Text
                        size="3"
                        weight="medium"
                        style={{ cursor: 'help' }}
                      >
                        {ref.title}
                      </Text>
                    </NoteHoverPreview>
                  )}
                  {ref.url && (
                    <Flex align="center" gap="2">
                      <ExternalLink className="w-3 h-3" style={{ color: 'var(--color-text-soft)' }} />
                      <Text
                        size="2"
                        style={{
                          color: 'var(--color-primary)',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                        onClick={() => window.open(ref.url!, '_blank')}
                      >
                        {ref.url}
                      </Text>
                    </Flex>
                  )}
                  {ref.description && (
                    <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                      {ref.description}
                    </Text>
                  )}
                  <Text size="1" style={{ color: 'var(--color-text-muted)' }}>
                    Added {new Date(ref.addedAt).toLocaleDateString()}
                  </Text>
                </Flex>
                <Flex gap="1">
                  <Button
                    variant="ghost"
                    size="1"
                    onClick={() => {
                      setNotesReferenceId(ref.id);
                      setNotesReferenceTitle(ref.title || 'Reference');
                      setNotesDialogOpen(true);
                    }}
                    title="Edit notes"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="1"
                    color="green"
                    onClick={() => {
                      setReaderReferenceId(ref.id);
                      setReaderCockpitOpen(true);
                    }}
                    title="Open reader cockpit"
                  >
                    <Book className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="1"
                    color="red"
                    onClick={() => removeReference.mutate(ref.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
      
      {notesReferenceId && (
        <ReferenceNotesDialog
          open={notesDialogOpen}
          onClose={() => {
            setNotesDialogOpen(false);
            setNotesReferenceId(null);
          }}
          referenceId={notesReferenceId}
          referenceTitle={notesReferenceTitle}
        />
      )}
      {readerReferenceId && (
        <ReaderCockpitDialog
          open={readerCockpitOpen}
          onClose={() => {
            setReaderCockpitOpen(false);
            setReaderReferenceId(null);
          }}
          referenceId={readerReferenceId}
        />
      )}
    </Flex>
  );
}
