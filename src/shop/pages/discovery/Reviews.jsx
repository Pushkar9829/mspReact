/**
 * PDP reviews: real summary and paginated list (GET /products/:slug/reviews), and a review form
 * gated on GET /products/:slug/reviews/eligibility (verified buyers only; posting again updates).
 */
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BadgeCheck, MessageSquareText } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api/index.js";
import { shopKeys, useProductReviews, useReviewEligibility } from "../../hooks/index.js";
import { Button, Field, Notice, RatingStars, Skeleton, StarRow, Textarea, toast } from "../../components/ui/index.js";
import { formatDate } from "../../../shared/lib/format.js";

const PAGE = 5;

function Summary({ summary }) {
  if (!summary?.count) return null;
  return (
    <div className="grid gap-4 rounded-card border border-shop-line bg-shop-card p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <div className="text-center sm:pr-4">
        <p className="font-display text-shop-3xl font-bold tabular-nums text-shop-ink">{Number(summary.rating).toFixed(1)}</p>
        <StarRow value={summary.rating} className="justify-center" />
        <p className="mt-1 text-shop-xs text-shop-muted">
          {summary.count} review{summary.count === 1 ? "" : "s"}
        </p>
      </div>
      <ul className="grid gap-1.5" aria-label="Rating breakdown">
        {(summary.bars || []).map((b) => (
          <li key={b.stars} className="grid grid-cols-[3rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-shop-xs text-shop-muted">
            <span className="tabular-nums">{b.stars} star</span>
            <span className="h-2 overflow-hidden rounded-full bg-shop-well" aria-hidden>
              <span className="block h-full rounded-full bg-shop-gold" style={{ width: `${b.pct}%` }} />
            </span>
            <span className="text-right tabular-nums">
              {b.count}
              <span className="sr-only"> {b.count === 1 ? "review" : "reviews"} with {b.stars} star{b.stars === 1 ? "" : "s"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewForm({ slug, productName, existing, onDone }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(existing?.rating || 0);
  const [body, setBody] = useState(existing?.body || "");
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () => api.createReview(slug, { rating, ...(body.trim() ? { body: body.trim() } : {}) }),
    onSuccess: (res) => {
      toast.success(existing ? "Review updated" : "Thanks for your review", {
        description: res?.status && res.status !== "published" ? "It will appear once it has been checked." : productName,
      });
      qc.invalidateQueries({ queryKey: [...shopKeys.all, "reviews", String(slug).toLowerCase()] });
      qc.invalidateQueries({ queryKey: [...shopKeys.all, "review-eligibility"] });
      qc.invalidateQueries({ queryKey: [...shopKeys.all, "product"] });
      onDone?.();
    },
    onError: (err) => setError(err?.message || "Could not save your review"),
  });
  return (
    <form
      className="grid gap-3 rounded-card border border-shop-line bg-shop-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        if (!rating) {
          setError("Choose a star rating");
          return;
        }
        save.mutate();
      }}
      noValidate
    >
      <h3 className="font-display text-shop-md font-bold text-shop-ink">{existing ? "Update your review" : "Write a review"}</h3>
      <RatingStars value={rating} onChange={setRating} label="Your rating" name="review-rating" />
      <Field label="Your review" optional hint="What should other buyers know? Quality, packing, freshness… (max 1000 characters)">
        <Textarea rows={4} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      {error ? (
        <p role="alert" className="text-shop-sm font-medium text-shop-danger-ink">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" loading={save.isPending}>
          {existing ? "Update review" : "Post review"}
        </Button>
        {onDone ? (
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Eligibility({ slug, productName }) {
  const location = useLocation();
  const elig = useReviewEligibility(slug);
  const [editing, setEditing] = useState(false);
  if (elig.isPending) return <Skeleton className="h-14 w-full rounded-card" />;
  const e = elig.data;
  if (!e || elig.error) return null;
  if (e.reason === "LOGIN_REQUIRED")
    return (
      <Notice tone="info" action={<Button variant="secondary" to="/login" state={{ from: `${location.pathname}${location.search}` }}>Sign in</Button>}>
        Bought this product? Sign in to review it.
      </Notice>
    );
  if (!e.canReview) return <Notice tone="info">{e.message || "Only buyers who received this product can review it."}</Notice>;
  if (e.existingReview && !editing)
    return (
      <Notice
        tone="success"
        action={
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        }
      >
        You rated this {e.existingReview.rating} out of 5{e.existingReview.status && e.existingReview.status !== "published" ? " — your review is hidden from other buyers right now" : ""}.
      </Notice>
    );
  return <ReviewForm slug={slug} productName={productName} existing={e.existingReview} onDone={e.existingReview ? () => setEditing(false) : undefined} />;
}

export function ProductReviews({ slug, productName }) {
  const [page, setPage] = useState(1);
  const q = useProductReviews(slug, page, PAGE);
  const data = q.data;
  const rows = data?.reviews || data?.data || [];
  const meta = data?.meta;
  const pages = meta?.pages || 1;

  return (
    <div className="grid gap-4">
      {q.isPending ? <Skeleton className="h-28 w-full rounded-card" /> : <Summary summary={data?.summary} />}
      <Eligibility slug={slug} productName={productName} />
      {q.isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-20 w-full rounded-card" />
          <Skeleton className="h-20 w-full rounded-card" />
        </div>
      ) : !rows.length ? (
        <div className="flex items-center gap-3 rounded-card border border-dashed border-shop-line-strong bg-shop-card p-4 text-shop-sm text-shop-muted">
          <MessageSquareText className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
          No reviews yet. Reviews come only from buyers who received this product.
        </div>
      ) : (
        <ul className={q.isPlaceholderData ? "grid gap-3 opacity-60" : "grid gap-3"} aria-busy={q.isPlaceholderData || undefined}>
          {rows.map((r) => (
            <li key={r.id} className="rounded-card border border-shop-line bg-shop-card p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <StarRow value={r.rating} />
                <span className="text-shop-sm font-semibold text-shop-ink">{r.authorName}</span>
                {r.verifiedPurchase ? (
                  <span className="inline-flex items-center gap-1 text-shop-xs font-medium text-shop-primary-ink">
                    <BadgeCheck className="size-3.5" aria-hidden /> Verified purchase
                  </span>
                ) : null}
                <span className="text-shop-xs text-shop-muted">{formatDate(r.createdAt)}</span>
              </div>
              {r.body ? <p className="mt-2 whitespace-pre-line text-shop-base text-shop-text">{r.body}</p> : null}
            </li>
          ))}
        </ul>
      )}
      {pages > 1 ? (
        <nav aria-label="Review pages" className="flex items-center justify-between gap-2">
          <Button variant="secondary" disabled={page <= 1 || q.isFetching} onClick={() => setPage((p) => p - 1)}>
            Newer
          </Button>
          <span className="text-shop-sm text-shop-muted tabular-nums">
            Page {page} of {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages || q.isFetching} onClick={() => setPage((p) => p + 1)}>
            Older
          </Button>
        </nav>
      ) : null}
      <p className="text-shop-xs text-shop-muted">
        Reviews are from buyers with a delivered order for this product. <Link to="/help#faq" className="underline">How reviews work</Link>
      </p>
    </div>
  );
}

export default ProductReviews;
