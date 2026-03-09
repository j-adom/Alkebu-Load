import "clsx";
import { B as BookDetailPage } from "../../../../../chunks/BookDetailPage.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const book = data.book;
    const seo = data.seo;
    const settings = data.settings;
    const booksByAuthor = data.booksByAuthor || [];
    const relatedBooks = data.relatedBooks || [];
    BookDetailPage($$renderer2, { book, seo, settings, booksByAuthor, relatedBooks });
  });
}
export {
  _page as default
};
