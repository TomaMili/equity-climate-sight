/**
 * Parse markdown-style bold (**text**) to HTML <strong> tags
 */
export function parseMarkdownBold(text: string): string {
  // Replace **text** with <strong>text</strong>
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
