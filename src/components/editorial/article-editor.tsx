"use client";

/**
 * Article editor (Client Component).
 *
 * Orchestrates:
 *  - per-locale translation tabs (en/so/ar) — each locale keeps its
 *    own draft (title, slug, excerpt, Tiptap JSON, contentText, SEO)
 *  - slug auto-generation: latinized via slugify (its charmap
 *    transliterates Arabic); stops auto-updating once manually edited
 *  - contentText extraction from Tiptap (feeds the tsvector trigger)
 *  - status flow: DRAFT / IN_REVIEW for everyone; PUBLISHED /
 *    SCHEDULED (+ featured/breaking flags) for Editors/Admins only —
 *    mirroring the API's RBAC so the UI never offers a forbidden move
 *  - cover image + inline images via the MediaLibrary picker modal
 *  - POST /api/articles (create) or PATCH /api/articles/[id] (edit)
 *
 * Only locales with a non-empty title AND body are submitted, so a
 * half-started Somali tab doesn't fail validation — partial
 * translation stays a first-class state, chips show the debt.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import slugify from "slugify";
import { type JSONContent } from "@tiptap/react";
import {
  CalendarClock,
  ImagePlus,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  RichTextEditor,
  type PickedImage,
} from "@/components/editorial/rich-text-editor";
import {
  MediaLibrary,
  type MediaItem,
} from "@/components/editorial/media-library";

// ----------------------------------------------------------------
// Types shared with the server page (plain-JSON serializable)
// ----------------------------------------------------------------

export type EditorLocale = "en" | "so" | "ar";
export type EditorStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ARCHIVED";

export interface TranslationDto {
  locale: EditorLocale;
  title: string;
  slug: string;
  excerpt: string | null;
  content: JSONContent;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface ArticleDto {
  id: string;
  status: EditorStatus;
  scheduledFor: string | null;
  categoryId: string | null;
  coverImage: { id: string; url: string; altText: string | null } | null;
  tagIds: string[];
  isFeatured: boolean;
  isBreaking: boolean;
  allowComments: boolean;
  translations: TranslationDto[];
}

export interface TaxonomyOption {
  id: string;
  name: string;
}

interface ArticleEditorProps {
  locale: string; // UI locale (for links)
  article: ArticleDto | null; // null = create mode
  categories: TaxonomyOption[];
  tags: TaxonomyOption[];
  isPrivileged: boolean; // Editor/Admin
}

// ----------------------------------------------------------------
// Per-locale draft state
// ----------------------------------------------------------------

interface Draft {
  title: string;
  slug: string;
  slugTouched: boolean;
  excerpt: string;
  content: JSONContent | null;
  contentText: string;
  seoTitle: string;
  seoDescription: string;
}

const LOCALES: { code: EditorLocale; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "so", label: "Soomaali", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

const emptyDraft = (): Draft => ({
  title: "",
  slug: "",
  slugTouched: false,
  excerpt: "",
  content: null,
  contentText: "",
  seoTitle: "",
  seoDescription: "",
});

const draftFromDto = (t: TranslationDto): Draft => ({
  title: t.title,
  slug: t.slug,
  slugTouched: true, // existing slugs never auto-regenerate (stable URLs)
  excerpt: t.excerpt ?? "",
  content: t.content,
  contentText: "", // recomputed by the editor when the tab is edited
  seoTitle: t.seoTitle ?? "",
  seoDescription: t.seoDescription ?? "",
});

/** Extract plain text from Tiptap JSON (for unedited tabs on save). */
const textFromJson = (node: JSONContent | null): string => {
  if (!node) return "";
  const own = typeof node.text === "string" ? node.text : "";
  const children = (node.content ?? []).map(textFromJson).join(" ");
  return [own, children].filter(Boolean).join(" ").trim();
};

const makeSlug = (title: string) =>
  slugify(title, { lower: true, strict: true, locale: "en" }).slice(0, 200);

const toDatetimeLocal = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function ArticleEditor({
  locale,
  article,
  categories,
  tags,
  isPrivileged,
}: ArticleEditorProps) {
  const router = useRouter();
  const isNew = article === null;

  const [drafts, setDrafts] = useState<Record<EditorLocale, Draft>>(() => {
    const base: Record<EditorLocale, Draft> = {
      en: emptyDraft(),
      so: emptyDraft(),
      ar: emptyDraft(),
    };
    for (const t of article?.translations ?? []) base[t.locale] = draftFromDto(t);
    return base;
  });
  const [activeTab, setActiveTab] = useState<EditorLocale>("en");

  const [status, setStatus] = useState<EditorStatus>(article?.status ?? "DRAFT");
  const [scheduledFor, setScheduledFor] = useState(
    toDatetimeLocal(article?.scheduledFor ?? null),
  );
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? "");
  const [tagIds, setTagIds] = useState<Set<string>>(
    new Set(article?.tagIds ?? []),
  );
  const [coverImage, setCoverImage] = useState(article?.coverImage ?? null);
  const [isFeatured, setIsFeatured] = useState(article?.isFeatured ?? false);
  const [isBreaking, setIsBreaking] = useState(article?.isBreaking ?? false);
  const [allowComments, setAllowComments] = useState(
    article?.allowComments ?? true,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Picker modal state: resolves the promise RichTextEditor awaits.
  const [picker, setPicker] = useState<{
    mode: "cover" | "inline";
    resolve?: (img: PickedImage | null) => void;
  } | null>(null);

  const updateDraft = (loc: EditorLocale, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [loc]: { ...prev[loc], ...patch } }));

  const onTitleChange = (loc: EditorLocale, title: string) => {
    const d = drafts[loc];
    updateDraft(loc, {
      title,
      slug: d.slugTouched ? d.slug : makeSlug(title),
    });
  };

  /** Locales with real content — the ones we'll submit. */
  const completedLocales = useMemo(
    () =>
      LOCALES.filter(({ code }) => {
        const d = drafts[code];
        const text = d.contentText || textFromJson(d.content);
        return d.title.trim().length >= 3 && text.trim().length > 0;
      }).map((l) => l.code),
    [drafts],
  );

  const requestImage = (mode: "cover" | "inline") =>
    new Promise<PickedImage | null>((resolve) => {
      setPicker({ mode, resolve });
    });

  const onPickerSelect = (item: MediaItem) => {
    if (picker?.mode === "cover") {
      setCoverImage({ id: item.id, url: item.url, altText: item.altText });
      picker.resolve?.(null);
    } else {
      picker?.resolve?.({ url: item.url, alt: item.altText });
    }
    setPicker(null);
  };

  const closePicker = () => {
    picker?.resolve?.(null);
    setPicker(null);
  };

  // --------------------------------------------------------------
  // Save
  // --------------------------------------------------------------

  async function save() {
    setError(null);
    setSaved(false);

    if (completedLocales.length === 0) {
      setError(
        "At least one language needs a title (3+ characters) and body text.",
      );
      return;
    }
    if (status === "SCHEDULED" && !scheduledFor) {
      setError("Pick a publish date and time to schedule this article.");
      return;
    }

    const translations = completedLocales.map((code) => {
      const d = drafts[code];
      return {
        locale: code,
        title: d.title.trim(),
        slug: d.slug || makeSlug(d.title),
        excerpt: d.excerpt.trim() || undefined,
        content: d.content,
        contentText: (d.contentText || textFromJson(d.content)).trim(),
        seoTitle: d.seoTitle.trim() || undefined,
        seoDescription: d.seoDescription.trim() || undefined,
      };
    });

    const payload = {
      status,
      ...(status === "SCHEDULED" && {
        scheduledFor: new Date(scheduledFor).toISOString(),
      }),
      categoryId: categoryId || (isNew ? undefined : null),
      coverImageId: coverImage?.id ?? (isNew ? undefined : null),
      tagIds: [...tagIds],
      isFeatured,
      isBreaking,
      allowComments,
      translations,
    };

    setSaving(true);
    try {
      const res = await fetch(
        isNew ? "/api/articles" : `/api/articles/${article.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          body?.issues?.map((i: { path: string; message: string }) => i.message).join(" ") ??
          body?.error ??
          `Save failed (HTTP ${res.status}).`;
        throw new Error(detail);
      }

      setSaved(true);
      if (isNew) {
        router.replace(`/${locale}/articles/${body.data.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------------------
  // Render
  // --------------------------------------------------------------

  const active = drafts[activeTab];
  const activeDir = LOCALES.find((l) => l.code === activeTab)!.dir;

  const input =
    "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20";
  const label = "block text-sm font-medium text-zinc-700";

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[1fr_290px]">
      {/* ============ Main column: translations ============ */}
      <div>
        {/* Locale tabs — chip language mirrors the list page */}
        <div className="flex gap-1 border-b border-zinc-200">
          {LOCALES.map(({ code, label: name }) => {
            const complete = completedLocales.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => setActiveTab(code)}
                aria-current={activeTab === code ? "page" : undefined}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === code
                    ? "border-indigo-700 text-indigo-700"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                }`}
              >
                {name}
                <span
                  aria-hidden
                  className={`h-2 w-2 rounded-full ${
                    complete ? "bg-indigo-600" : "border border-dashed border-zinc-400"
                  }`}
                  title={complete ? "Has content" : "Empty"}
                />
              </button>
            );
          })}
        </div>

        {/* Active locale form. Keyed by tab so Tiptap remounts with
            the right document instead of imperative content-swapping. */}
        <div key={activeTab} dir={activeDir} className="mt-5 space-y-5">
          <div>
            <label htmlFor="title" className={label}>
              Title
            </label>
            <input
              id="title"
              value={active.title}
              onChange={(e) => onTitleChange(activeTab, e.target.value)}
              className={`${input} mt-1.5 text-base font-semibold`}
              placeholder="Headline"
            />
          </div>

          <div dir="ltr">
            <label htmlFor="slug" className={label}>
              Slug
            </label>
            <input
              id="slug"
              value={active.slug}
              onChange={(e) =>
                updateDraft(activeTab, {
                  slug: makeSlug(e.target.value) || e.target.value,
                  slugTouched: true,
                })
              }
              className={`${input} mt-1.5 font-mono text-xs`}
              placeholder="auto-generated-from-title"
            />
          </div>

          <div>
            <label htmlFor="excerpt" className={label}>
              Excerpt
            </label>
            <textarea
              id="excerpt"
              rows={2}
              maxLength={500}
              value={active.excerpt}
              onChange={(e) => updateDraft(activeTab, { excerpt: e.target.value })}
              className={`${input} mt-1.5 resize-y`}
              placeholder="One or two sentences shown in listings and search results."
            />
          </div>

          <div>
            <span className={label}>Body</span>
            <div className="mt-1.5">
              <RichTextEditor
                content={active.content}
                dir={activeDir}
                onChange={(json, text) =>
                  updateDraft(activeTab, { content: json, contentText: text })
                }
                onRequestImage={() => requestImage("inline")}
              />
            </div>
          </div>

          <details className="rounded-md border border-zinc-200 bg-white">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-zinc-700">
              SEO overrides ({activeTab})
            </summary>
            <div className="space-y-4 border-t border-zinc-200 px-4 py-4">
              <div>
                <label htmlFor="seoTitle" className={label}>
                  SEO title{" "}
                  <span className="font-normal text-zinc-400">(max 70)</span>
                </label>
                <input
                  id="seoTitle"
                  maxLength={70}
                  value={active.seoTitle}
                  onChange={(e) => updateDraft(activeTab, { seoTitle: e.target.value })}
                  className={`${input} mt-1.5`}
                />
              </div>
              <div>
                <label htmlFor="seoDescription" className={label}>
                  SEO description{" "}
                  <span className="font-normal text-zinc-400">(max 160)</span>
                </label>
                <textarea
                  id="seoDescription"
                  rows={2}
                  maxLength={160}
                  value={active.seoDescription}
                  onChange={(e) =>
                    updateDraft(activeTab, { seoDescription: e.target.value })
                  }
                  className={`${input} mt-1.5 resize-y`}
                />
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* ============ Side column: publishing ============ */}
      <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
        {/* Status & save */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <label htmlFor="status" className={label}>
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as EditorStatus)}
            className={`${input} mt-1.5`}
          >
            <option value="DRAFT">Draft</option>
            <option value="IN_REVIEW">In review</option>
            {isPrivileged && (
              <>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </>
            )}
          </select>

          {status === "SCHEDULED" && (
            <div className="mt-3">
              <label htmlFor="scheduledFor" className={label}>
                <CalendarClock className="me-1 inline h-3.5 w-3.5" aria-hidden />
                Publish at
              </label>
              <input
                id="scheduledFor"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className={`${input} mt-1.5`}
              />
            </div>
          )}

          {!isPrivileged && (
            <p className="mt-3 text-xs text-zinc-500">
              Submit as “In review” when it's ready — an editor publishes it.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Saved.
            </p>
          )}

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-800 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {saving ? "Saving…" : isNew ? "Create article" : "Save changes"}
          </button>
          <p className="mt-2 text-center text-[11px] text-zinc-400">
            Saving {completedLocales.length || "no"} language
            {completedLocales.length === 1 ? "" : "s"}
          </p>
        </section>

        {/* Cover image */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <span className={label}>Cover image</span>
          {coverImage ? (
            <div className="relative mt-2 overflow-hidden rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImage.url}
                alt={coverImage.altText ?? ""}
                className="aspect-video w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setCoverImage(null)}
                title="Remove cover image"
                className="absolute end-1.5 top-1.5 rounded-full bg-zinc-900/70 p-1 text-white hover:bg-zinc-900"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void requestImage("cover")}
              className="mt-2 flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-indigo-400 hover:text-indigo-600"
            >
              <ImagePlus className="h-5 w-5" aria-hidden />
              <span className="text-xs font-medium">Choose from library</span>
            </button>
          )}
        </section>

        {/* Category & tags */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <label htmlFor="category" className={label}>
            Category
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`${input} mt-1.5`}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <span className={`${label} mt-4`}>Tags</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.length === 0 && (
              <p className="text-xs text-zinc-400">No tags yet.</p>
            )}
            {tags.map((t) => {
              const on = tagIds.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setTagIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(t.id)) next.delete(t.id);
                      else next.add(t.id);
                      return next;
                    })
                  }
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                    on
                      ? "bg-indigo-700 text-white ring-indigo-700"
                      : "bg-white text-zinc-600 ring-zinc-300 hover:ring-indigo-400"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Editorial flags */}
        <section className="space-y-2.5 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          {isPrivileged && (
            <>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-700 focus:ring-indigo-600"
                />
                Featured on homepage
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={isBreaking}
                  onChange={(e) => setIsBreaking(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-700 focus:ring-indigo-600"
                />
                Breaking news
              </label>
            </>
          )}
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={allowComments}
              onChange={(e) => setAllowComments(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-indigo-700 focus:ring-indigo-600"
            />
            Allow comments
          </label>
        </section>
      </aside>

      {/* ============ Media picker modal ============ */}
      {picker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Choose an image"
          onClick={closePicker}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">
                {picker.mode === "cover" ? "Choose a cover image" : "Insert an image"}
              </h2>
              <button
                type="button"
                onClick={closePicker}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <MediaLibrary compact onSelect={onPickerSelect} />
          </div>
        </div>
      )}
    </div>
  );
}
