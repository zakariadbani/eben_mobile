import type { ImageSourcePropType } from "react-native";
import type { Category } from "@/interfaces/Category";

export interface CategoryLookupEntry {
  image: Category["image"];
  categoryTitle: string;
  categoryTitleAr: string;
}

/** Maps every category node (any level) to its image + nearest-ancestor title,
 * so a saved DraftItem (which only stores categoryId/title/titleAr) can
 * resolve a thumbnail/"Catégorie" line at render time from the already
 * loaded tree — nothing extra is persisted to AsyncStorage. Falls back to the
 * node's own title/image when no L1/L2 ancestor exists (orphan/non-leaf ids,
 * e.g. from a persisted draft or products/[productId]).
 *
 * Moved verbatim out of CreateRequestScreen.tsx so the request detail screen
 * can build the same lookup from its own loaded category tree.
 */
export function buildCategoryLookup(categories: Category[]): Map<number, CategoryLookupEntry> {
  const map = new Map<number, CategoryLookupEntry>();
  const walk = (nodes: Category[], l1: Category | null, l2: Category | null) => {
    for (const node of nodes) {
      map.set(node.id, {
        image: node.image ?? l2?.image ?? l1?.image ?? null,
        categoryTitle: (l1 ?? l2 ?? node).title,
        categoryTitleAr: (l1 ?? l2 ?? node).titleAr,
      });
      if (node.level === 1) { walk(node.children ?? [], node, null); continue; }
      if (node.level === 2) { walk(node.children ?? [], l1, node); continue; }
    }
  };
  walk(categories, null, null);
  return map;
}

export function resolveImageSource(image: Category["image"] | undefined): ImageSourcePropType | undefined {
  if (image === null || image === undefined || image === "") return undefined;
  return typeof image === "string" ? { uri: image } : image;
}
