"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useNestliStore } from "../../lib/nestli-store";

type MomentCategory =
  | "milestone"
  | "feeding"
  | "sleep"
  | "mood"
  | "health"
  | "note";

type PostVisibility = "family" | "private";
type ContentStyle = "paragraph" | "bullets" | "checkboxes";
type JournalView = "family" | "private";

type CommentItem = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

type JournalPost = {
  id: string;
  author: string;
  createdAt: string;
  targetMemberIds: string[];
  category: MomentCategory;
  visibility: PostVisibility;
  title: string;
  contentStyle: ContentStyle;
  text?: string;
  items?: ChecklistItem[];
  likes: string[];
  comments: CommentItem[];
  imageUrls?: string[];
};

const categoryOptions: Array<{
  id: MomentCategory;
  label: string;
  emoji: string;
}> = [
  { id: "milestone", label: "Milestone", emoji: "🌟" },
  { id: "feeding", label: "Feeding", emoji: "🍼" },
  { id: "sleep", label: "Sleep", emoji: "😴" },
  { id: "mood", label: "Mood", emoji: "💛" },
  { id: "health", label: "Health", emoji: "🩺" },
  { id: "note", label: "Notes", emoji: "📝" },
];

const composerEmojiOptions = [
  "😊",
  "🥹",
  "😂",
  "😍",
  "🥳",
  "🤒",
  "😴",
  "🍼",
  "🍓",
  "❤️",
  "💛",
  "✨",
  "🎉",
  "👍",
  "🙏",
  "📌",
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getRelativeTimeLabel(iso: string) {
  const now = new Date().getTime();
  const t = new Date(iso).getTime();
  const diffMinutes = Math.floor((now - t) / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getCategoryBadge(category: MomentCategory) {
  switch (category) {
    case "milestone":
      return "bg-violet-50 text-violet-700";
    case "feeding":
      return "bg-orange-50 text-orange-700";
    case "sleep":
      return "bg-blue-50 text-blue-700";
    case "mood":
      return "bg-pink-50 text-pink-700";
    case "health":
      return "bg-emerald-50 text-emerald-700";
    case "note":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function renderTextWithMentions(text: string) {
  const parts = text.split(/(@[A-Za-z0-9_]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span key={index} className="font-medium text-emerald-700">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

async function filesToDataUrls(files: FileList | null) {
  if (!files || files.length === 0) return [];

  const readers = Array.from(files).map(
    (file) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })
  );

  return Promise.all(readers);
}

function buildSearchableText(post: JournalPost) {
  const dateObj = new Date(post.createdAt);
  const dateParts = [
    post.title,
    post.author,
    post.text || "",
    ...(post.items ?? []).map((item) => item.text),
    ...(post.comments ?? []).map((comment) => comment.text),
    getRelativeTimeLabel(post.createdAt),
    dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    dateObj.toLocaleDateString("en-US"),
  ];

  return dateParts.join(" ").toLowerCase();
}

export default function JournalPage() {
  const store = useNestliStore() as any;
  const {
    familyMembers,
    profile,
    journalPosts,
    addJournalPost,
    updateJournalPost,
    deleteJournalPost,
  } = store;

  const actualFamilyMembers = useMemo(() => {
    return familyMembers.filter((member: any) => member.id !== "all");
  }, [familyMembers]);

  const displayName = profile?.displayName || "Sarah";

  const [selectedMemberId, setSelectedMemberId] = useState("all");
  const [currentView, setCurrentView] = useState<JournalView>("family");
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState<JournalView>("family");

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<JournalPost | null>(null);
  const [deleteTargetPostId, setDeleteTargetPostId] = useState<string | null>(
    null
  );

  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [newTargetMemberIds, setNewTargetMemberIds] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<MomentCategory>("milestone");
  const [newContentStyle, setNewContentStyle] =
    useState<ContentStyle>("paragraph");
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const familyFeedPosts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return (journalPosts as JournalPost[])
      .filter((post) => post.visibility === "family")
      .filter((post) => {
        if (selectedMemberId === "all") return true;
        return post.targetMemberIds.includes(selectedMemberId);
      })
      .filter((post) => {
        if (!q) return true;
        return buildSearchableText(post).includes(q);
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [journalPosts, selectedMemberId, searchTerm]);

  const myPrivatePosts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return (journalPosts as JournalPost[])
      .filter((post) => post.visibility === "private")
      .filter((post) => post.author === displayName)
      .filter((post) => {
        if (!q) return true;
        return buildSearchableText(post).includes(q);
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [journalPosts, displayName, searchTerm]);

  useEffect(() => {
    if (!selectedPost) return;
    const fresh = (journalPosts as JournalPost[]).find(
      (post) => post.id === selectedPost.id
    );
    if (!fresh) {
      setSelectedPost(null);
      return;
    }
    setSelectedPost(fresh);
  }, [journalPosts, selectedPost]);

  function resetComposer(mode: JournalView) {
    const defaultMember = actualFamilyMembers[0]?.id ?? "emma";
    setComposerMode(mode);
    setEditingPostId(null);
    setNewTargetMemberIds(mode === "family" ? [defaultMember] : []);
    setNewCategory("milestone");
    setNewContentStyle("paragraph");
    setNewTitle("");
    setNewText("");
    setNewImageUrls([]);
  }

  function openComposer(mode: JournalView) {
    resetComposer(mode);
    setShowComposer(true);
  }

  function loadPostIntoComposer(post: JournalPost) {
    const mode = post.visibility === "family" ? "family" : "private";
    setComposerMode(mode);
    setEditingPostId(post.id);
    setNewTargetMemberIds(post.targetMemberIds);
    setNewCategory(post.category);
    setNewContentStyle(post.contentStyle);
    setNewTitle(post.title);
    setNewImageUrls(post.imageUrls ?? []);

    if (post.contentStyle === "paragraph") {
      setNewText(post.text ?? "");
    } else {
      const lines = (post.items ?? []).map((item) => item.text).join("\n");
      setNewText(lines);
    }

    setShowComposer(true);
  }

  function toggleTargetMember(memberId: string) {
    setNewTargetMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  function insertMention(name: string) {
    setNewText((prev) => `${prev}${prev ? " " : ""}@${name}`);
  }

  function insertComposerEmoji(emoji: string) {
    setNewText((prev) => `${prev}${prev ? " " : ""}${emoji}`);
  }

  async function handleImagePick(files: FileList | null) {
    setIsLoadingImages(true);
    try {
      const urls = await filesToDataUrls(files);
      setNewImageUrls((prev) => [...prev, ...urls]);
    } finally {
      setIsLoadingImages(false);
    }
  }

  function removeComposerImage(index: number) {
    setNewImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function saveEntry() {
    if (!newTitle.trim()) return;
    if (!newText.trim() && newImageUrls.length === 0) return;

    let items: ChecklistItem[] | undefined;
    let text: string | undefined;

    if (newContentStyle === "paragraph") {
      text = newText.trim();
    } else {
      const lines = newText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      items = lines.map((line, index) => ({
        id: `${Date.now()}_${index}`,
        text: line,
        checked: false,
      }));
    }

    const visibility: PostVisibility =
      composerMode === "family" ? "family" : "private";

    const existingPost = editingPostId
      ? (journalPosts as JournalPost[]).find((p) => p.id === editingPostId)
      : null;

    const post: JournalPost = {
      id: editingPostId ?? String(Date.now()),
      author: displayName,
      createdAt: existingPost?.createdAt ?? new Date().toISOString(),
      targetMemberIds:
        visibility === "family"
          ? newTargetMemberIds.length > 0
            ? newTargetMemberIds
            : actualFamilyMembers[0]
              ? [actualFamilyMembers[0].id]
              : []
          : [],
      category: visibility === "family" ? newCategory : "note",
      visibility,
      title: newTitle.trim(),
      contentStyle: newContentStyle,
      text,
      items,
      likes: existingPost?.likes ?? [],
      comments: existingPost?.comments ?? [],
      imageUrls: newImageUrls,
    };

    if (editingPostId) {
      updateJournalPost(post);
    } else {
      addJournalPost(post);
    }

    setShowComposer(false);
    resetComposer(currentView);
  }

  function toggleLike(postId: string) {
    const post = (journalPosts as JournalPost[]).find((p) => p.id === postId);
    if (!post) return;

    const alreadyLiked = post.likes.includes(displayName);

    const updated = {
      ...post,
      likes: alreadyLiked
        ? post.likes.filter((name) => name !== displayName)
        : [...post.likes, displayName],
    };

    updateJournalPost(updated);
  }

  function addComment(postId: string) {
    const draft = (commentDrafts[postId] || "").trim();
    if (!draft) return;

    const post = (journalPosts as JournalPost[]).find((p) => p.id === postId);
    if (!post) return;

    const newComment: CommentItem = {
      id: String(Date.now()),
      author: displayName,
      text: draft,
      createdAt: new Date().toISOString(),
    };

    updateJournalPost({
      ...post,
      comments: [...post.comments, newComment],
    });

    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    setOpenComments((prev) => ({ ...prev, [postId]: true }));
  }

  function toggleChecklistItem(postId: string, itemId: string) {
    const post = (journalPosts as JournalPost[]).find((p) => p.id === postId);
    if (!post || !post.items) return;

    updateJournalPost({
      ...post,
      items: post.items.map((item) =>
        item.id === itemId
          ? { ...item, checked: !item.checked }
          : item
      ),
    });
  }

  function requestDelete(postId: string) {
    setDeleteTargetPostId(postId);
    setSelectedPost(null);
  }

  function confirmDelete() {
    if (!deleteTargetPostId) return;
    deleteJournalPost(deleteTargetPostId);
    setDeleteTargetPostId(null);
    setSelectedPost(null);
  }

  function renderPostBody(post: JournalPost) {
    if (post.contentStyle === "paragraph") {
      return post.text ? (
        <div className="mt-2 text-sm leading-6 text-slate-600">
          {renderTextWithMentions(post.text)}
        </div>
      ) : null;
    }

    if (post.contentStyle === "bullets") {
      return (
        <ul className="mt-2 space-y-2 text-sm text-slate-600">
          {(post.items || []).map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <span className="mt-1 text-slate-400">•</span>
              <span>{renderTextWithMentions(item.text)}</span>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <div className="mt-2 space-y-2">
        {(post.items || []).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => toggleChecklistItem(post.id, item.id)}
            className="flex w-full items-start gap-3 rounded-xl bg-slate-50 px-3 py-3 text-left"
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-xs",
                item.checked
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300 bg-white text-transparent"
              )}
            >
              ✓
            </span>
            <span
              className={cn(
                "text-sm text-slate-600",
                item.checked && "line-through text-slate-400"
              )}
            >
              {renderTextWithMentions(item.text)}
            </span>
          </button>
        ))}
      </div>
    );
  }

  function renderImages(imageUrls?: string[]) {
    if (!imageUrls || imageUrls.length === 0) return null;

    return (
      <div className="mt-3 grid grid-cols-3 gap-2">
        {imageUrls.map((src, index) => (
          <div
            key={`${src}_${index}`}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
          >
            <img
              src={src}
              alt={`attachment ${index + 1}`}
              className="h-24 w-full object-cover"
            />
          </div>
        ))}
      </div>
    );
  }

  function renderPostCard(post: JournalPost, privateMode = false) {
    const categoryMeta =
      categoryOptions.find((item) => item.id === post.category) ??
      categoryOptions[0];

    const targetNames = actualFamilyMembers
      .filter((member: any) => post.targetMemberIds.includes(member.id))
      .map((member: any) => member.name)
      .join(", ");

    const likedByMe = post.likes.includes(displayName);
    const commentsOpen = Boolean(openComments[post.id]);

    return (
      <div
        key={post.id}
        className="rounded-2xl border border-slate-200 bg-white p-4"
      >
        <div
          onClick={() => setSelectedPost(post)}
          className="w-full cursor-pointer text-left"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setSelectedPost(post);
            }
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[10px] font-semibold capitalize",
                  getCategoryBadge(post.category)
                )}
              >
                {categoryMeta.emoji} {categoryMeta.label}
              </span>

              {privateMode ? (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                  Private
                </span>
              ) : null}
            </div>

            <span className="text-xs text-slate-400">
              {getRelativeTimeLabel(post.createdAt)}
            </span>
          </div>

          <div className="text-base font-semibold text-slate-800">
            {post.title}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            by {post.author}
            {!privateMode && targetNames ? ` · for ${targetNames}` : ""}
          </div>

          {renderPostBody(post)}
          {renderImages(post.imageUrls)}
        </div>

        {!privateMode ? (
          <>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => toggleLike(post.id)}
                className={cn(
                  "rounded-full px-3 py-2 text-sm",
                  likedByMe
                    ? "bg-pink-50 font-semibold text-pink-700"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                ❤️ {post.likes.length}
              </button>

              <button
                onClick={() =>
                  setOpenComments((prev) => ({
                    ...prev,
                    [post.id]: !prev[post.id],
                  }))
                }
                className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600"
              >
                💬 {post.comments.length}
              </button>
            </div>

            {commentsOpen ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                <div className="space-y-3">
                  {post.comments.length > 0 ? (
                    post.comments.map((comment) => (
                      <div key={comment.id} className="rounded-xl bg-white p-3">
                        <div className="text-xs font-semibold text-slate-700">
                          {comment.author}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {renderTextWithMentions(comment.text)}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {getRelativeTimeLabel(comment.createdAt)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-400">No comments yet</div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={commentDrafts[post.id] || ""}
                    onChange={(e) =>
                      setCommentDrafts((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                    placeholder="Add a comment..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                  />
                  <button
                    onClick={() => addComment(post.id)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  const activePosts = currentView === "family" ? familyFeedPosts : myPrivatePosts;
  const searchPlaceholder =
    currentView === "family"
      ? "Search family moments by date or keyword..."
      : "Search notes by date or keyword...";

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="app-themed mx-auto flex min-h-screen w-full max-w-md flex-col bg-white shadow-sm dark:bg-slate-900">
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                Nestli
              </p>
              <h1 className="text-lg font-semibold">Journal</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowSearch((prev) => !prev);
                  if (showSearch) setSearchTerm("");
                }}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full text-lg shadow-sm",
                  showSearch
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700"
                )}
              >
                🔍
              </button>

              <button
                onClick={() => openComposer(currentView)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-xl text-white shadow-sm"
              >
                ✏️
              </button>
            </div>
          </div>

          {showSearch ? (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-base">🔍</span>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                {searchTerm ? (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-sm text-slate-400"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setCurrentView("family");
                setSearchTerm("");
              }}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm transition",
                currentView === "family"
                  ? "bg-emerald-600 font-semibold text-white"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              Family Feed
            </button>
            <button
              onClick={() => {
                setCurrentView("private");
                setSearchTerm("");
              }}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm transition",
                currentView === "private"
                  ? "bg-emerald-600 font-semibold text-white"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              My Notes
            </button>
          </div>

          {currentView === "family" ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedMemberId("all")}
                className={cn(
                  "rounded-full border px-3 py-2 text-sm transition",
                  selectedMemberId === "all"
                    ? "border-emerald-600 bg-emerald-600 font-semibold text-white"
                    : "border-slate-200 bg-white text-slate-600"
                )}
              >
                All Family
              </button>

              {actualFamilyMembers.map((member: any) => {
                const active = selectedMemberId === member.id;
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
                      active
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    <span className="text-base">{member.avatar}</span>
                    {member.name}
                  </button>
                );
              })}
            </div>
          ) : null}
        </header>

        <div className="flex-1 space-y-6 px-4 pb-24 pt-4">
          {currentView === "family" ? (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Family Feed
                </div>
                <span className="text-sm text-slate-400">
                  {selectedMemberId === "all"
                    ? "All family"
                    : actualFamilyMembers.find((m: any) => m.id === selectedMemberId)?.name}
                </span>
              </div>

              <div className="space-y-3">
                {activePosts.length > 0 ? (
                  activePosts.map((post) => renderPostCard(post, false))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    {searchTerm ? "No matching family moments" : "No family moments yet"}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                My Notes
              </div>

              <div className="space-y-3">
                {activePosts.length > 0 ? (
                  activePosts.map((post) => renderPostCard(post, true))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    {searchTerm ? "No matching private notes" : "No private notes yet"}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <BottomTabBar active="journal" />

        {showComposer ? (
          <div className="fixed inset-0 z-30 flex items-end bg-black/35">
            <button
              className="absolute inset-0"
              aria-label="Close composer"
              onClick={() => setShowComposer(false)}
            />
            <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-4 pb-6 pt-3 shadow-2xl">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />

              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">
                  {composerMode === "family" ? "Create a moment" : "Create a note"}
                </h2>
                <button
                  onClick={() => setShowComposer(false)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                {composerMode === "family" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        For whom
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {actualFamilyMembers.map((member: any) => {
                          const active = newTargetMemberIds.includes(member.id);
                          return (
                            <button
                              key={member.id}
                              onClick={() => toggleTargetMember(member.id)}
                              className={cn(
                                "rounded-full border px-3 py-2 text-sm transition",
                                active
                                  ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              )}
                            >
                              {member.avatar} {member.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Category
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {categoryOptions.map((item) => {
                          const active = newCategory === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => setNewCategory(item.id)}
                              className={cn(
                                "flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm transition",
                                active
                                  ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              )}
                            >
                              <span>{item.emoji}</span>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        @Mention family
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {actualFamilyMembers.map((member: any) => (
                          <button
                            key={member.id}
                            onClick={() => insertMention(member.name)}
                            className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600"
                          >
                            @{member.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Content style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: "paragraph", label: "Paragraph" },
                          { id: "bullets", label: "Bullets" },
                          { id: "checkboxes", label: "Checkboxes" },
                        ] as const
                      ).map((item) => {
                        const active = newContentStyle === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setNewContentStyle(item.id)}
                            className={cn(
                              "rounded-2xl border px-3 py-3 text-sm transition",
                              active
                                ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                            )}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Title
                  </label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Give this entry a title..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Description / details
                  </label>
                  <div className="mb-2 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    {composerEmojiOptions.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertComposerEmoji(emoji)}
                        className="rounded-full bg-white px-3 py-2 text-lg shadow-sm"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder={
                      composerMode === "family"
                        ? "Write your moment here..."
                        : newContentStyle === "paragraph"
                          ? "Write your private note..."
                          : "Enter one item per line..."
                    }
                    className="min-h-[140px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Add pictures
                  </label>
                  <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    {isLoadingImages ? "Loading..." : "Choose images"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleImagePick(e.target.files)}
                    />
                  </label>

                  {newImageUrls.length > 0 ? (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {newImageUrls.map((src, index) => (
                        <div
                          key={`${src}_${index}`}
                          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                        >
                          <img
                            src={src}
                            alt={`selected ${index + 1}`}
                            className="h-24 w-full object-cover"
                          />
                          <button
                            onClick={() => removeComposerImage(index)}
                            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <button
                  onClick={saveEntry}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  {editingPostId ? "Save changes" : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {selectedPost ? (
          <div className="fixed inset-0 z-30 flex items-end bg-black/35">
            <button
              className="absolute inset-0"
              aria-label="Close detail"
              onClick={() => setSelectedPost(null)}
            />
            <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-4 pb-6 pt-3 shadow-2xl">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />

              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">
                  {selectedPost.visibility === "family" ? "Moment detail" : "Note detail"}
                </h2>
                <button
                  onClick={() => {
                    setSelectedPost(null);
                    loadPostIntoComposer(selectedPost);
                  }}
                  className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[10px] font-semibold capitalize",
                          getCategoryBadge(selectedPost.category)
                        )}
                      >
                        {
                          categoryOptions.find(
                            (item) => item.id === selectedPost.category
                          )?.emoji
                        }{" "}
                        {
                          categoryOptions.find(
                            (item) => item.id === selectedPost.category
                          )?.label
                        }
                      </span>

                      {selectedPost.visibility === "private" ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                          Private
                        </span>
                      ) : null}
                    </div>

                    <span className="text-xs text-slate-400">
                      {getRelativeTimeLabel(selectedPost.createdAt)}
                    </span>
                  </div>

                  <div className="text-lg font-semibold text-slate-900">
                    {selectedPost.title}
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    by {selectedPost.author}
                  </div>

                  {renderPostBody(selectedPost)}
                  {renderImages(selectedPost.imageUrls)}
                </div>

                {selectedPost.visibility === "family" ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Family interactions
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleLike(selectedPost.id)}
                        className={cn(
                          "rounded-full px-3 py-2 text-sm",
                          selectedPost.likes.includes(displayName)
                            ? "bg-pink-50 font-semibold text-pink-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        ❤️ {selectedPost.likes.length}
                      </button>

                      <button
                        onClick={() =>
                          setOpenComments((prev) => ({
                            ...prev,
                            [selectedPost.id]: true,
                          }))
                        }
                        className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600"
                      >
                        💬 {selectedPost.comments.length}
                      </button>
                    </div>
                  </div>
                ) : null}

                <button
                  onClick={() => requestDelete(selectedPost.id)}
                  className="w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {deleteTargetPostId ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
              <h3 className="text-base font-semibold text-slate-900">
                Confirm deletion
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                This will permanently remove this entry.
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setDeleteTargetPostId(null)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function BottomTabBar({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white">
      <TabItem href="/home" label="🏠" text="Home" active={active === "home"} />
      <TabItem
        href="/calendar"
        label="📅"
        text="Calendar"
        active={active === "calendar"}
      />
      <TabItem href="/health" label="❤️" text="Health" active={active === "health"} />
      <TabItem
        href="/journal"
        label="📷"
        text="Journal"
        active={active === "journal"}
      />
      <TabItem
        href="/profile"
        label="👤"
        text="Profile"
        active={active === "profile"}
      />
    </nav>
  );
}

function TabItem({
  href,
  label,
  text,
  active,
}: {
  href: string;
  label: string;
  text: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-1 px-2 py-3"
    >
      <div className={active ? "text-emerald-700" : "text-slate-400"}>
        {label}
      </div>
      <span
        className={cn(
          "text-[11px]",
          active ? "font-semibold text-emerald-700" : "text-slate-400"
        )}
      >
        {text}
      </span>
    </Link>
  );
}
