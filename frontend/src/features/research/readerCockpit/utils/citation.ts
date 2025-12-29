export function buildCitation(referenceId: number, anchor?: string | null) {
  if (anchor && anchor.trim()) {
    return `[[ref:${referenceId}#${anchor.trim()}]]`;
  }
  return `[[ref:${referenceId}]]`;
}
