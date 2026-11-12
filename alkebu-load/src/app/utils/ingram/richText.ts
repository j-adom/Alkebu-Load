// Description HTML -> plain text and a minimal Lexical document (paragraphs of plain text).
// Deterministic and dependency-free: Ingram text never leaves this process (agreement §2(c)).

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Paragraphs of plain text from description HTML (or plain text with blank-line breaks). */
export function htmlToParagraphs(html: string): string[] {
  const marked = String(html ?? '')
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|blockquote)\s*>/gi, '\n\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, ' ');
  return decodeEntities(marked)
    .split(/\n\s*\n+/)
    .map((p) =>
      p
        .split('\n')
        .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
        .filter(Boolean)
        .join(' '),
    )
    .filter(Boolean);
}

export function htmlToPlainText(html: string): string {
  return htmlToParagraphs(html).join('\n\n');
}

/** A Lexical editor state with one paragraph per input paragraph (Payload's richText JSON). */
export function paragraphsToLexical(paragraphs: string[]): Record<string, unknown> {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        textStyle: '',
        children: [{ type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 }],
      })),
    },
  };
}
