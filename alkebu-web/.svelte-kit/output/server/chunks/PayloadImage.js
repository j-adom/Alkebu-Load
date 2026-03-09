import "clsx";
/* empty css                                           */
function PayloadImage($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      image,
      maxWidth = 1200,
      alt = void 0,
      sizes = "100vw",
      $$slots,
      $$events,
      ...rest
    } = $$props;
    image?.width && image?.height ? image.width / image.height : 16 / 9;
    image?.url;
    image?.sizes ? Object.entries(image.sizes).map(([key, size]) => `${size.url} ${size.width}w`).join(", ") : "";
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  PayloadImage as P
};
