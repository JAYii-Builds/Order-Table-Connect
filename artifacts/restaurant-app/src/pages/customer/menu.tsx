import { useState } from "react";
import {
  useListMenuItems,
  getListMenuItemsQueryKey,
  MenuItem,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ShoppingCart, Search, UtensilsCrossed, Leaf, Wine, Coffee, Star } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All Items", icon: UtensilsCrossed },
  { value: "appetizer", label: "Appetizers", icon: Leaf },
  { value: "main", label: "Mains", icon: UtensilsCrossed },
  { value: "side", label: "Sides", icon: Star },
  { value: "dessert", label: "Desserts", icon: Star },
  { value: "drink", label: "Drinks", icon: Wine },
  { value: "special", label: "Specials", icon: Coffee },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  appetizer: "bg-chart-2/15 text-chart-2",
  main: "bg-primary/15 text-primary",
  side: "bg-chart-3/15 text-chart-3",
  dessert: "bg-chart-4/15 text-chart-4",
  drink: "bg-chart-3/15 text-chart-3",
  special: "bg-chart-5/15 text-chart-5",
};

function MenuCard({ item }: { item: MenuItem }) {
  return (
    <div
      className="bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group"
      data-testid={`menu-card-${item.id}`}
    >
      {/* Image placeholder */}
      <div className="h-44 bg-muted flex items-center justify-center relative overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30" />
        )}
        {!item.is_available && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground bg-card px-3 py-1 rounded-full border border-border">
              Unavailable
            </span>
          </div>
        )}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[item.category] ?? "bg-muted text-muted-foreground"}`}>
          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3
            className="font-semibold text-foreground leading-snug"
            data-testid={`menu-item-name-${item.id}`}
          >
            {item.name}
          </h3>
          <span
            className="text-primary font-bold text-base shrink-0"
            data-testid={`menu-item-price-${item.id}`}
          >
            ${Number(item.price).toFixed(2)}
          </span>
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        <button
          disabled={!item.is_available}
          data-testid={`button-add-to-cart-${item.id}`}
          className="mt-3 w-full py-2 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {item.is_available ? "Add to Order" : "Unavailable"}
        </button>
      </div>
    </div>
  );
}

export default function CustomerMenuPage() {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useListMenuItems(
    { available_only: true },
    { query: { queryKey: getListMenuItemsQueryKey({ available_only: true }) } }
  );

  const filtered = items.filter((item) => {
    const matchCat = category === "all" || item.category === category;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.description?.toLowerCase().includes(q) ?? false);
    return matchCat && matchSearch;
  });

  return (
    <DashboardLayout role="customer" roleLabel="Customer" roleColor="text-chart-1">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            Menu
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse our full menu and add items to your order.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search menu items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              data-testid={`tab-category-${cat.value}`}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                category === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-card-border text-foreground/70 hover:text-foreground hover:bg-muted"
              }`}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border border-card-border rounded-xl overflow-hidden animate-pulse"
              >
                <div className="h-44 bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {search ? "No items match your search" : "No items in this category"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground mt-5">
            Showing {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
