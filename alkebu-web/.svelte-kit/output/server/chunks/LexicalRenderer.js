import { j as attributes } from "./index2.js";
import { h as html } from "./html.js";
function LexicalRenderer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { content, $$slots, $$events, ...rest } = $$props;
    function renderNode(node) {
      if (!node) return null;
      if (node.type === "text") {
        let text = node.text || "";
        if (node.format) {
          if (node.format & 1) text = `<strong>${text}</strong>`;
          if (node.format & 2) text = `<em>${text}</em>`;
          if (node.format & 4) text = `<s>${text}</s>`;
          if (node.format & 8) text = `<u>${text}</u>`;
          if (node.format & 16) text = `<code>${text}</code>`;
          if (node.format & 32) text = `<sub>${text}</sub>`;
          if (node.format & 64) text = `<sup>${text}</sup>`;
        }
        return text;
      }
      if (node.type === "paragraph") {
        return { tag: "p", children: node.children?.map(renderNode) || [] };
      }
      if (node.type === "heading") {
        const tag = `h${node.tag || 2}`;
        return { tag, children: node.children?.map(renderNode) || [] };
      }
      if (node.type === "list") {
        const tag = node.listType === "number" ? "ol" : "ul";
        return { tag, children: node.children?.map(renderNode) || [] };
      }
      if (node.type === "listitem") {
        return { tag: "li", children: node.children?.map(renderNode) || [] };
      }
      if (node.type === "quote") {
        return {
          tag: "blockquote",
          children: node.children?.map(renderNode) || []
        };
      }
      if (node.type === "link" || node.type === "autolink") {
        return {
          tag: "a",
          attrs: {
            href: node.url || node.fields?.url,
            target: node.fields?.newTab ? "_blank" : void 0,
            rel: node.fields?.newTab ? "noopener noreferrer" : void 0
          },
          children: node.children?.map(renderNode) || []
        };
      }
      if (node.type === "code") {
        return {
          tag: "pre",
          children: [
            { tag: "code", children: node.children?.map(renderNode) || [] }
          ]
        };
      }
      if (node.type === "horizontalrule") {
        return { tag: "hr" };
      }
      if (node.type === "linebreak") {
        return { tag: "br" };
      }
      if (node.type === "upload") {
        const value = node.value;
        if (value && typeof value === "object" && value.url) {
          return {
            tag: "img",
            attrs: {
              src: value.url,
              alt: value.alt || value.filename || "",
              width: value.width,
              height: value.height
            }
          };
        }
      }
      if (node.children) {
        return node.children.map(renderNode);
      }
      return null;
    }
    let processedContent = (() => {
      if (!content) return [];
      if (Array.isArray(content)) return content.flatMap(renderNode);
      if (content.root && content.root.children) {
        return content.root.children.flatMap(renderNode);
      }
      return [];
    })();
    function renderHTML(nodes) {
      if (!nodes || !Array.isArray(nodes)) return "";
      return nodes.map((node) => {
        if (typeof node === "string") return node;
        if (!node) return "";
        const { tag, attrs, children } = node;
        if (!tag) return "";
        if (["br", "hr", "img"].includes(tag)) {
          const attrStr2 = attrs ? Object.entries(attrs).filter(([_, v]) => v !== void 0).map(([k, v]) => `${k}="${v}"`).join(" ") : "";
          return `<${tag}${attrStr2 ? " " + attrStr2 : ""} />`;
        }
        const attrStr = attrs ? Object.entries(attrs).filter(([_, v]) => v !== void 0).map(([k, v]) => `${k}="${v}"`).join(" ") : "";
        const childrenHTML = children ? renderHTML(children) : "";
        return `<${tag}${attrStr ? " " + attrStr : ""}>${childrenHTML}</${tag}>`;
      }).join("");
    }
    if (processedContent && processedContent.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div${attributes({ class: "lexical-content prose", ...rest })}>${html(renderHTML(processedContent))}</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  LexicalRenderer as L
};
