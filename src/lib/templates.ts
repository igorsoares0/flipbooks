import type { Template } from "@/lib/types";

// Static template catalog. Picking one creates an editable copy (spec §17);
// template layouts themselves arrive with the editor phase.
export const TEMPLATES: Template[] = [
  { id: "tpl_editorial", name: "Editorial", category: "Magazines", pageCount: 24, tint: "#F4EFE6" },
  { id: "tpl_product_grid", name: "Product Grid", category: "Catalogs", pageCount: 16, tint: "#EDF1FB" },
  { id: "tpl_minimal_zine", name: "Minimal Zine", category: "Magazines", pageCount: 12, tint: "#F6F4EF" },
  { id: "tpl_bold_type", name: "Bold Type", category: "Marketing", pageCount: 20, tint: "#F5E9E4" },
  { id: "tpl_report", name: "Report", category: "Reports", pageCount: 32, tint: "#EFF3EF" },
  { id: "tpl_lookbook", name: "Lookbook", category: "Portfolios", pageCount: 28, tint: "#F1EDF4" },
  { id: "tpl_menu", name: "Menu", category: "Business", pageCount: 8, tint: "#F6F1E4" },
  { id: "tpl_brochure", name: "Brochure", category: "Brochures", pageCount: 6, tint: "#EAF0F3" },
];

export function findTemplate(id: string | undefined) {
  return TEMPLATES.find((t) => t.id === id);
}
