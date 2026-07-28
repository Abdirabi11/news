"use client";

/**
 * Tiptap rich-text editor wrapper.
 *
 * One controlled-ish instance: the parent owns the document JSON per
 * locale and swaps content on tab change via the `content` prop key
 * strategy (parent remounts by key) — simpler and safer than
 * imperative setContent bookkeeping.
 *
 * onChange emits BOTH the Tiptap JSON (stored in the DB and rendered
 * on the reader site) and the plain text (contentText — the tsvector
 * trigger's food). Extracting text here, at the moment of editing,
 * is what keeps search in lockstep with content.
 *
 * `dir` flips the writing direction per locale (rtl for Arabic).
 * `onRequestImage` lets the parent open the media library and
 * resolve with a picked image.
 */
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
} from "lucide-react";

export interface PickedImage {
  url: string;
  alt: string | null;
}

interface RichTextEditorProps {
  content: JSONContent | null;
  dir: "ltr" | "rtl";
  onChange: (json: JSONContent, text: string) => void;
  onRequestImage: () => Promise<PickedImage | null>;
}

export function RichTextEditor({
  content,
  dir,
  onChange,
  onRequestImage,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // SSR-safe under the App Router
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }, // h1 is the article title field
      }),
      Image.configure({ inline: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
    ],
    content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        dir,
        class:
          "prose prose-zinc max-w-none min-h-[320px] px-4 py-3 focus:outline-none prose-headings:font-semibold",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON(), editor.getText());
    },
  });

  if (!editor) {
    return (
      <div className="min-h-[320px] animate-pulse rounded-b-md bg-zinc-50" />
    );
  }

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImage = async () => {
    const picked = await onRequestImage();
    if (!picked) return;
    editor
      .chain()
      .focus()
      .setImage({ src: picked.url, alt: picked.alt ?? "" })
      .run();
  };

  const btn = (active: boolean) =>
    `rounded p-1.5 transition-colors ${
      active
        ? "bg-indigo-100 text-indigo-700"
        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
    }`;

  return (
    <div className="rounded-md border border-zinc-300 bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20">
      {/* Toolbar — always LTR; tool order shouldn't mirror */}
      <div
        dir="ltr"
        className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 px-2 py-1.5"
        role="toolbar"
        aria-label="Formatting"
      >
        <button type="button" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))}>
          <Bold className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))}>
          <Italic className="h-4 w-4" aria-hidden />
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-200" aria-hidden />
        <button type="button" title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive("heading", { level: 2 }))}>
          <Heading2 className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive("heading", { level: 3 }))}>
          <Heading3 className="h-4 w-4" aria-hidden />
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-200" aria-hidden />
        <button type="button" title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))}>
          <List className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))}>
          <ListOrdered className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" title="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))}>
          <Quote className="h-4 w-4" aria-hidden />
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-200" aria-hidden />
        <button type="button" title="Link" onClick={setLink} className={btn(editor.isActive("link"))}>
          <LinkIcon className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" title="Insert image" onClick={insertImage} className={btn(false)}>
          <ImageIcon className="h-4 w-4" aria-hidden />
        </button>
        <span className="mx-1 h-5 w-px bg-zinc-200" aria-hidden />
        <button type="button" title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={`${btn(false)} disabled:opacity-40`}>
          <Undo2 className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={`${btn(false)} disabled:opacity-40`}>
          <Redo2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
