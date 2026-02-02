<script lang="ts">
  /**
   * Lexical Rich Text Renderer for Payload CMS
   * Replaces PortableText for rendering Payload's Lexical editor content
   */

  interface Props {
    content: any;
    [key: string]: any;
  }

  let { content, ...rest }: Props = $props();

  // Helper to render a single Lexical node
  function renderNode(node: any): any {
    if (!node) return null;

    // Text nodes
    if (node.type === 'text') {
      let text = node.text || '';

      // Apply formatting
      if (node.format) {
        if (node.format & 1) text = `<strong>${text}</strong>`; // Bold
        if (node.format & 2) text = `<em>${text}</em>`; // Italic
        if (node.format & 4) text = `<s>${text}</s>`; // Strikethrough
        if (node.format & 8) text = `<u>${text}</u>`; // Underline
        if (node.format & 16) text = `<code>${text}</code>`; // Code
        if (node.format & 32) text = `<sub>${text}</sub>`; // Subscript
        if (node.format & 64) text = `<sup>${text}</sup>`; // Superscript
      }

      return text;
    }

    // Paragraph
    if (node.type === 'paragraph') {
      return {
        tag: 'p',
        children: node.children?.map(renderNode) || []
      };
    }

    // Headings
    if (node.type === 'heading') {
      const tag = `h${node.tag || 2}`;
      return {
        tag,
        children: node.children?.map(renderNode) || []
      };
    }

    // Lists
    if (node.type === 'list') {
      const tag = node.listType === 'number' ? 'ol' : 'ul';
      return {
        tag,
        children: node.children?.map(renderNode) || []
      };
    }

    if (node.type === 'listitem') {
      return {
        tag: 'li',
        children: node.children?.map(renderNode) || []
      };
    }

    // Quote
    if (node.type === 'quote') {
      return {
        tag: 'blockquote',
        children: node.children?.map(renderNode) || []
      };
    }

    // Link
    if (node.type === 'link' || node.type === 'autolink') {
      return {
        tag: 'a',
        attrs: {
          href: node.url || node.fields?.url,
          target: node.fields?.newTab ? '_blank' : undefined,
          rel: node.fields?.newTab ? 'noopener noreferrer' : undefined
        },
        children: node.children?.map(renderNode) || []
      };
    }

    // Code block
    if (node.type === 'code') {
      return {
        tag: 'pre',
        children: [{
          tag: 'code',
          children: node.children?.map(renderNode) || []
        }]
      };
    }

    // Horizontal rule
    if (node.type === 'horizontalrule') {
      return { tag: 'hr' };
    }

    // Line break
    if (node.type === 'linebreak') {
      return { tag: 'br' };
    }

    // Upload/Image (Payload upload field)
    if (node.type === 'upload') {
      const value = node.value;
      if (value && typeof value === 'object' && value.url) {
        return {
          tag: 'img',
          attrs: {
            src: value.url,
            alt: value.alt || value.filename || '',
            width: value.width,
            height: value.height
          }
        };
      }
    }

    // Handle children if present
    if (node.children) {
      return node.children.map(renderNode);
    }

    return null;
  }

  // Process the content root
  let processedContent = $derived.by(() => {
    if (!content) return [];
    if (Array.isArray(content)) return content.flatMap(renderNode);
    if (content.root && content.root.children) {
      return content.root.children.flatMap(renderNode);
    }
    return [];
  });

  // Helper to render processed nodes as HTML
  function renderHTML(nodes: any[]): string {
    if (!nodes || !Array.isArray(nodes)) return '';

    return nodes.map(node => {
      if (typeof node === 'string') return node;
      if (!node) return '';

      const { tag, attrs, children } = node;
      if (!tag) return '';

      // Self-closing tags
      if (['br', 'hr', 'img'].includes(tag)) {
        const attrStr = attrs ? Object.entries(attrs)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ') : '';
        return `<${tag}${attrStr ? ' ' + attrStr : ''} />`;
      }

      // Regular tags
      const attrStr = attrs ? Object.entries(attrs)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ') : '';
      const childrenHTML = children ? renderHTML(children) : '';

      return `<${tag}${attrStr ? ' ' + attrStr : ''}>${childrenHTML}</${tag}>`;
    }).join('');
  }
</script>

{#if processedContent && processedContent.length > 0}
  <div class="lexical-content prose" {...rest}>
    {@html renderHTML(processedContent)}
  </div>
{/if}

<style>
  :global(.lexical-content.prose) {
    line-height: 1.75;
  }

  :global(.lexical-content.prose p) {
    margin-bottom: 1em;
  }

  :global(.lexical-content.prose h1) {
    font-size: 2em;
    font-weight: 700;
    margin-top: 0.67em;
    margin-bottom: 0.67em;
  }

  :global(.lexical-content.prose h2) {
    font-size: 1.5em;
    font-weight: 700;
    margin-top: 0.83em;
    margin-bottom: 0.83em;
  }

  :global(.lexical-content.prose h3) {
    font-size: 1.17em;
    font-weight: 700;
    margin-top: 1em;
    margin-bottom: 1em;
  }

  :global(.lexical-content.prose ul, .lexical-content.prose ol) {
    margin-left: 2em;
    margin-bottom: 1em;
  }

  :global(.lexical-content.prose li) {
    margin-bottom: 0.5em;
  }

  :global(.lexical-content.prose blockquote) {
    border-left: 4px solid #e5e7eb;
    padding-left: 1em;
    font-style: italic;
    margin: 1.5em 0;
  }

  :global(.lexical-content.prose pre) {
    background-color: #f3f4f6;
    padding: 1em;
    border-radius: 0.375rem;
    overflow-x: auto;
    margin: 1em 0;
  }

  :global(.lexical-content.prose code) {
    background-color: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.875em;
  }

  :global(.lexical-content.prose pre code) {
    background-color: transparent;
    padding: 0;
  }

  :global(.lexical-content.prose a) {
    color: #2563eb;
    text-decoration: underline;
  }

  :global(.lexical-content.prose a:hover) {
    color: #1d4ed8;
  }

  :global(.lexical-content.prose img) {
    max-width: 100%;
    height: auto;
    margin: 1em 0;
  }

  :global(.lexical-content.prose hr) {
    border: 0;
    border-top: 1px solid #e5e7eb;
    margin: 2em 0;
  }
</style>
