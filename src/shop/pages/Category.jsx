/**
 * /category/:slug — category listing and search results (`?q=`). `all` lists everything.
 * The header search keeps the category scope (/category/<slug>?q=…) and records the search; this
 * page never records it again.
 */
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FolderSearch } from "lucide-react";
import { useCategories } from "../hooks/index.js";
import { Button, EmptyState, cn } from "../components/ui/index.js";
import { ProductListing } from "./discovery/ProductListing.jsx";
import { displayName } from "../lib/text.js";

function SubcategoryNav({ node, parent, current, query }) {
  const items = node?.children?.length ? node.children : parent?.children || [];
  if (!items.length) return null;
  const owner = node?.children?.length ? node : parent;
  const qs = query ? `?q=${encodeURIComponent(query)}` : "";
  return (
    <nav aria-label={`${owner.name} sub-categories`} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      <Link
        to={`/category/${owner.slug}${qs}`}
        aria-current={current === owner.slug ? "page" : undefined}
        className={cn(
          "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-shop-sm font-medium transition-colors pointer-coarse:h-11",
          current === owner.slug ? "border-shop-ink bg-shop-ink text-white" : "border-shop-line-strong bg-shop-card text-shop-ink hover:border-shop-primary"
        )}
      >
        All {displayName(owner.name)}
      </Link>
      {items.map((c) => (
        <Link
          key={c.slug}
          to={`/category/${c.slug}${qs}`}
          aria-current={current === c.slug ? "page" : undefined}
          className={cn(
            "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-shop-sm font-medium transition-colors pointer-coarse:h-11",
            current === c.slug ? "border-shop-ink bg-shop-ink text-white" : "border-shop-line-strong bg-shop-card text-shop-ink hover:border-shop-primary"
          )}
        >
          {displayName(c.name)}
        </Link>
      ))}
    </nav>
  );
}

export default function Category() {
  const { slug = "all" } = useParams();
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const cats = useCategories();
  const isAll = slug === "all";
  const node = isAll ? null : cats.data?.bySlug.get(slug);
  const parent = node?.parentId ? cats.data?.byId.get(node.parentId) : null;

  if (!isAll && cats.data && !node) {
    return (
      <div className="msr-gutter py-10">
        <EmptyState
          icon={FolderSearch}
          title="Category not found"
          description="This category was renamed or removed. Search or browse everything instead."
          action={<Button to={q ? `/category/all?q=${encodeURIComponent(q)}` : "/category/all"}>Browse all products</Button>}
        />
      </div>
    );
  }

  const path = isAll ? [] : cats.data?.pathOf(slug) || [];
  const breadcrumbs = [
    { label: "Home", to: "/" },
    ...(q ? [{ label: "All products", to: `/category/all` }] : isAll ? [] : [{ label: "All products", to: "/category/all" }]),
    ...path.map((c) => ({ label: displayName(c.name), to: `/category/${c.slug}` })),
    ...(q ? [{ label: `Search: ${q}` }] : isAll ? [{ label: "All products" }] : []),
  ];
  const name = node?.name ? displayName(node.name) : isAll ? "All products" : "";
  const title = q ? (isAll ? `Results for “${q}”` : `“${q}” in ${name || "this category"}`) : name || " ";

  return (
    <ProductListing
      category={slug}
      title={title}
      documentTitle={q ? `Search: ${q}` : name || "Products"}
      description={!q ? node?.description || (isAll ? "Wholesale prices on groceries, staples and FMCG from verified sellers." : "") : ""}
      breadcrumbs={breadcrumbs}
      subnav={node ? <SubcategoryNav node={node} parent={parent} current={slug} query={q} /> : null}
    />
  );
}
