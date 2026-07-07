import { useState } from "react";
import {
  useListMenuItems,
  getListMenuItemsQueryKey,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  MenuItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["appetizer", "main", "dessert", "drink", "side", "special"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  appetizer: "Appetizer",
  main: "Main",
  dessert: "Dessert",
  drink: "Drink",
  side: "Side",
  special: "Special",
};

const CATEGORY_COLORS: Record<Category, string> = {
  appetizer: "bg-chart-2/15 text-chart-2",
  main: "bg-primary/15 text-primary",
  side: "bg-chart-3/15 text-chart-3",
  dessert: "bg-chart-4/15 text-chart-4",
  drink: "bg-chart-3/15 text-chart-3",
  special: "bg-chart-5/15 text-chart-5",
};

const menuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be a valid price"),
  category: z.enum(CATEGORIES),
  image_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  is_available: z.boolean(),
  sort_order: z.string().optional(),
});

type MenuItemFormValues = z.infer<typeof menuItemSchema>;

function MenuItemModal({
  item,
  onClose,
}: {
  item: MenuItem | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateMenuItem();
  const updateMutation = useUpdateMenuItem();
  const isEditing = item !== null;

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: item?.name ?? "",
      description: item?.description ?? "",
      price: item ? String(Number(item.price).toFixed(2)) : "",
      category: (item?.category as Category) ?? "main",
      image_url: item?.image_url ?? "",
      is_available: item?.is_available ?? true,
      sort_order: item ? String(item.sort_order) : "0",
    },
  });

  function onSubmit(values: MenuItemFormValues) {
    const payload = {
      name: values.name,
      description: values.description || null,
      price: parseFloat(values.price),
      category: values.category,
      image_url: values.image_url || null,
      is_available: values.is_available,
      sort_order: parseInt(values.sort_order ?? "0") || 0,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: item.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
            toast({ title: "Menu item updated" });
            onClose();
          },
          onError: () => toast({ title: "Failed to update item", variant: "destructive" }),
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
            toast({ title: "Menu item created" });
            onClose();
          },
          onError: () => toast({ title: "Failed to create item", variant: "destructive" }),
        }
      );
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-card-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">
            {isEditing ? "Edit Menu Item" : "Add Menu Item"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Grilled Salmon" data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={2}
                        placeholder="Short description…"
                        data-testid="input-description"
                        className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₱) *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" data-testid="input-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          data-testid="select-category"
                          className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {CATEGORY_LABELS[c]}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://…" data-testid="input-image-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" placeholder="0" data-testid="input-sort-order" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_available"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Available</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={field.value}
                            onClick={() => field.onChange(!field.value)}
                            data-testid="toggle-available"
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              field.value ? "bg-primary" : "bg-muted"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                field.value ? "translate-x-4" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                          <span className="text-sm text-muted-foreground">
                            {field.value ? "Yes" : "No"}
                          </span>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-submit-item">
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : isEditing ? (
                    "Save Changes"
                  ) : (
                    "Add Item"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  item,
  onConfirm,
  onClose,
  isDeleting,
}: {
  item: MenuItem;
  onConfirm: () => void;
  onClose: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-card-border rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 className="font-semibold text-foreground mb-2">Delete Menu Item?</h2>
        <p className="text-sm text-muted-foreground mb-5">
          <strong>"{item.name}"</strong> will be permanently removed from the menu.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="button-confirm-delete"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ManagerMenuPage() {
  const [modalItem, setModalItem] = useState<MenuItem | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading } = useListMenuItems(
    {},
    { query: { queryKey: getListMenuItemsQueryKey() } }
  );

  const deleteMutation = useDeleteMenuItem();
  const updateMutation = useUpdateMenuItem();

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
          toast({ title: "Item deleted" });
          setDeleteTarget(null);
        },
        onError: () => {
          toast({ title: "Failed to delete item", variant: "destructive" });
        },
      }
    );
  }

  function handleToggleAvailability(item: MenuItem) {
    updateMutation.mutate(
      { id: item.id, data: { is_available: !item.is_available } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
          toast({
            title: item.is_available ? "Item hidden from menu" : "Item now available",
          });
        },
        onError: () => toast({ title: "Failed to update availability", variant: "destructive" }),
      }
    );
  }

  const grouped = CATEGORIES.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <DashboardLayout role="manager" roleLabel="Manager" roleColor="text-chart-4">
      {modalItem !== undefined && (
        <MenuItemModal item={modalItem} onClose={() => setModalItem(undefined)} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          item={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}

      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
              Menu Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Add, edit, remove items, and control availability.
            </p>
          </div>
          <Button
            onClick={() => setModalItem(null)}
            data-testid="button-add-item"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        {/* Summary */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="bg-card border border-card-border rounded-lg px-4 py-3">
            <div className="text-xs text-muted-foreground">Total Items</div>
            <div className="text-xl font-bold text-foreground">{items.length}</div>
          </div>
          <div className="bg-card border border-card-border rounded-lg px-4 py-3">
            <div className="text-xs text-muted-foreground">Available</div>
            <div className="text-xl font-bold text-chart-2">{items.filter((i) => i.is_available).length}</div>
          </div>
          <div className="bg-card border border-card-border rounded-lg px-4 py-3">
            <div className="text-xs text-muted-foreground">Hidden</div>
            <div className="text-xl font-bold text-muted-foreground">{items.filter((i) => !i.is_available).length}</div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-card border border-card-border rounded-xl">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-4">No menu items yet</p>
            <Button onClick={() => setModalItem(null)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add your first item
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {CATEGORIES.filter((cat) => grouped[cat]?.length > 0).map((cat) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[cat]}`}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span className="text-xs text-muted-foreground">{grouped[cat].length} item{grouped[cat].length !== 1 ? "s" : ""}</span>
                </div>
                <div className="bg-card border border-card-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Description</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Price</th>
                        <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {grouped[cat].map((item) => (
                        <tr
                          key={item.id}
                          data-testid={`menu-row-${item.id}`}
                          className={`hover:bg-muted/30 transition-colors ${!item.is_available ? "opacity-60" : ""}`}
                        >
                          <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell max-w-xs truncate">
                            {item.description ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            ${Number(item.price).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleToggleAvailability(item)}
                              disabled={updateMutation.isPending}
                              data-testid={`toggle-availability-${item.id}`}
                              title={item.is_available ? "Click to hide" : "Click to show"}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                                item.is_available
                                  ? "bg-chart-2/15 text-chart-2 hover:bg-chart-2/25"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {item.is_available ? (
                                <>
                                  <Eye className="h-3 w-3" /> Available
                                </>
                              ) : (
                                <>
                                  <EyeOff className="h-3 w-3" /> Hidden
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setModalItem(item)}
                                data-testid={`button-edit-${item.id}`}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(item)}
                                data-testid={`button-delete-${item.id}`}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
