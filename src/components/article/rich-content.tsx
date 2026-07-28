import { type JSONContent } from "@tiptap/react";
import { Fragment, type ReactNode } from "react";

const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];

const safeHref = (href: unknown): string | null => {
  if (typeof href !== "string") return null;
  try {
    const url = new URL(href, "https://placeholder.invalid");
    return SAFE_PROTOCOLS.includes(url.protocol) ? href : null;
  } catch {
    return null;
  }
};

/** Wrap a text node's content in its marks, inside-out. */
const applyMarks = (text: string, marks: JSONContent["marks"]): ReactNode => {
  let node: ReactNode = text;
  for (const mark of marks ?? []) {
    switch (mark.type) {
      case "bold":
        node = <strong>{node}</strong>;
        break;
      case "italic":
        node = <em>{node}</em>;
        break;
      case "strike":
        node = <s>{node}</s>;
        break;
      case "code":
        node = (
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-[0.9em]">
            {node}
          </code>
        );
        break;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (href) {
          node = (
            <a
              href={href}
              rel="noopener noreferrer"
              className="text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:decoration-indigo-700"
            >
              {node}
            </a>
          );
        }
        break;
      }
      default:
        break; // unknown mark: render unstyled text
    }
  }
  return node;
};

const renderChildren = (node: JSONContent): ReactNode =>
  (node.content ?? []).map((child, i) => (
    <Fragment key={i}>{renderNode(child)}</Fragment>
  ));

const renderNode = (node: JSONContent): ReactNode => {
  switch (node.type) {
    case "text":
      return applyMarks(node.text ?? "", node.marks);

    case "paragraph":
      return <p>{renderChildren(node)}</p>;

    case "heading": {
      const level = node.attrs?.level === 3 ? 3 : 2;
      return level === 3 ? (
        <h3>{renderChildren(node)}</h3>
      ) : (
        <h2>{renderChildren(node)}</h2>
      );
    }

    case "bulletList":
      return <ul>{renderChildren(node)}</ul>;

    case "orderedList":
      return <ol>{renderChildren(node)}</ol>;

    case "listItem":
      return <li>{renderChildren(node)}</li>;

    case "blockquote":
      return <blockquote>{renderChildren(node)}</blockquote>;

    case "image": {
      const src = safeHref(node.attrs?.src);
      if (!src) return null;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      // Body images have unknown dimensions (worker-verified later),
      // so a plain <img> with lazy loading beats next/image here;
      // the cover image — the LCP candidate — does use next/image.
      // eslint-disable-next-line @next/next/no-img-element
      return (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="rounded-lg"
        />
      );
    }

    case "hardBreak":
      return <br />;

    case "horizontalRule":
      return <hr />;

    case "codeBlock":
      return (
        <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
          <code>{renderChildren(node)}</code>
        </pre>
      );

    default:
      // Unknown node type: render its children so content written
      // with newer editor extensions degrades instead of vanishing.
      return renderChildren(node);
  }
};

export function RichContent({ content }: { content: JSONContent }) {
  if (content?.type !== "doc") return null;
  return (
    <div className="prose prose-zinc max-w-none prose-headings:font-semibold prose-a:font-normal rtl:prose-blockquote:border-l-0 rtl:prose-blockquote:border-r-4 rtl:prose-blockquote:pl-0 rtl:prose-blockquote:pr-4">
      {renderChildren(content)}
    </div>
  );
}
