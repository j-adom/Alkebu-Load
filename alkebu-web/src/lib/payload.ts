/**
 * Payload CMS Image URL Builder
 * Uses Payload's pre-generated responsive sizes for optimal performance
 * Image URLs are proxied through SvelteKit (/api/media/file/[...path])
 */

export interface PayloadImage {
  url: string;
  filename?: string;
  mimeType?: string;
  filesize?: number;
  width?: number;
  height?: number;
  sizes?: Record<string, {
    url: string | null;
    width: number | null;
    height: number | null;
    mimeType: string | null;
    filesize: number | null;
    filename: string | null;
  }>;
}

export type ImageSize = 'thumbnail' | 'card' | 'tablet' | 'hero';

/**
 * Extract actual image from various Payload structures
 */
function extractImage(source: any): PayloadImage | null {
  if (!source) return null;
  
  // Already a proper image object with url
  if (source.url) return source as PayloadImage;
  
  // Nested structure like { image: { url: "..." } }
  if (source.image?.url) return source.image as PayloadImage;
  
  // String URL
  if (typeof source === 'string') return { url: source };
  
  return null;
}

/**
 * Rewrite an absolute Payload media URL to go through the SvelteKit proxy.
 * e.g. https://payload.alkebulanimages.com/api/media/file/foo.jpg → /api/media/file/foo.jpg
 */
function toProxyUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    // Only rewrite if it looks like a Payload media URL
    if (parsed.pathname.startsWith('/api/media/file/')) {
      return parsed.pathname;
    }
  } catch {
    // Not an absolute URL — already relative, return as-is
  }
  return url;
}

/**
 * Sanity-like builder that uses Payload's pre-generated sizes
 */
export class PayloadImageUrlBuilder {
  private image: PayloadImage | null;
  private selectedSize: ImageSize = 'card';

  constructor(source: any) {
    this.image = extractImage(source);
  }

  /**
   * Select appropriate pre-generated size based on target width
   */
  width(targetWidth: number): this {
    if (!this.image?.sizes) return this;

    // Map target widths to Payload's pre-configured sizes
    if (targetWidth <= 400) {
      this.selectedSize = 'thumbnail';
    } else if (targetWidth <= 768) {
      this.selectedSize = 'card';
    } else if (targetWidth <= 1024) {
      this.selectedSize = 'tablet';
    } else {
      this.selectedSize = 'hero';
    }

    return this;
  }

  /**
   * These methods maintain API compatibility with Sanity
   * Actual transformations are handled by Payload's pre-generated sizes
   */
  height(height: number): this { return this; }
  fit(mode: string): this { return this; }
  auto(format: string): this { return this; }
  quality(quality: number): this { return this; }
  saturation(amount: number): this { return this; }

  /**
   * Get the optimized image URL, rewritten to go through the SvelteKit media proxy
   */
  url(): string {
    if (!this.image) return '';

    // Try to use selected pre-generated size
    const selectedSizeData = this.image.sizes?.[this.selectedSize];
    if (selectedSizeData?.url) {
      return toProxyUrl(selectedSizeData.url);
    }

    // Fallback: Try other sizes in order of preference
    if (this.image.sizes) {
      const fallbackOrder: ImageSize[] = ['card', 'thumbnail', 'tablet', 'hero'];
      for (const size of fallbackOrder) {
        if (this.image.sizes[size]?.url) {
          return toProxyUrl(this.image.sizes[size].url);
        }
      }
    }

    // Final fallback to original URL
    return toProxyUrl(this.image.url || '');
  }
}

/**
 * Create an image URL builder (Sanity-compatible API)
 */
export function urlFor(source: any): PayloadImageUrlBuilder {
  return new PayloadImageUrlBuilder(source);
}

/**
 * Get optimized image URL directly (without builder pattern)
 */
export function getImageUrl(
  source: any,
  options: { size?: ImageSize; fallback?: string } = {}
): string {
  const { size = 'card', fallback = '/assets/images/resources/placeholder.jpg' } = options;

  const image = extractImage(source);
  if (!image) return fallback;

  // Try requested size
  if (image.sizes?.[size]?.url) {
    return toProxyUrl(image.sizes[size].url);
  }

  // Fallback to other sizes
  if (image.sizes) {
    const fallbackOrder: ImageSize[] = ['card', 'thumbnail', 'tablet', 'hero'];
    for (const sizeKey of fallbackOrder) {
      if (image.sizes[sizeKey]?.url) {
        return toProxyUrl(image.sizes[sizeKey].url);
      }
    }
  }

  // Final fallback to original or placeholder
  return toProxyUrl(image.url) || fallback;
}

/**
 * Generate srcset for responsive images
 */
export function getImageSrcset(source: any): string {
  const image = extractImage(source);
  if (!image?.sizes) return '';

  return Object.values(image.sizes)
    .filter(size => size?.url && size?.width)
    .map(size => `${toProxyUrl(size.url!)} ${size.width}w`)
    .join(', ');
}
