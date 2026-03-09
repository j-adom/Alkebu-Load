function extractImage(source) {
  if (!source) return null;
  if (source.url) return source;
  if (source.image?.url) return source.image;
  if (typeof source === "string") return { url: source };
  return null;
}
class PayloadImageUrlBuilder {
  constructor(source) {
    this.selectedSize = "card";
    this.image = extractImage(source);
  }
  /**
   * Select appropriate pre-generated size based on target width
   */
  width(targetWidth) {
    if (!this.image?.sizes) return this;
    if (targetWidth <= 400) {
      this.selectedSize = "thumbnail";
    } else if (targetWidth <= 768) {
      this.selectedSize = "card";
    } else if (targetWidth <= 1024) {
      this.selectedSize = "tablet";
    } else {
      this.selectedSize = "hero";
    }
    return this;
  }
  /**
   * These methods maintain API compatibility with Sanity
   * Actual transformations are handled by Payload's pre-generated sizes
   */
  height(height) {
    return this;
  }
  fit(mode) {
    return this;
  }
  auto(format) {
    return this;
  }
  quality(quality) {
    return this;
  }
  saturation(amount) {
    return this;
  }
  /**
   * Get the optimized image URL
   */
  url() {
    if (!this.image) return "";
    const selectedSizeData = this.image.sizes?.[this.selectedSize];
    if (selectedSizeData?.url) {
      return selectedSizeData.url;
    }
    if (this.image.sizes) {
      const fallbackOrder = ["card", "thumbnail", "tablet", "hero"];
      for (const size of fallbackOrder) {
        if (this.image.sizes[size]?.url) {
          return this.image.sizes[size].url;
        }
      }
    }
    return this.image.url || "";
  }
}
function urlFor(source) {
  return new PayloadImageUrlBuilder(source);
}
function getImageUrl(source, options = {}) {
  const { size = "card", fallback = "/assets/images/resources/placeholder.jpg" } = options;
  const image = extractImage(source);
  if (!image) return fallback;
  if (image.sizes?.[size]?.url) {
    return image.sizes[size].url;
  }
  if (image.sizes) {
    const fallbackOrder = ["card", "thumbnail", "tablet", "hero"];
    for (const sizeKey of fallbackOrder) {
      if (image.sizes[sizeKey]?.url) {
        return image.sizes[sizeKey].url;
      }
    }
  }
  return image.url || fallback;
}
export {
  getImageUrl as g,
  urlFor as u
};
