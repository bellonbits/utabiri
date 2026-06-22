/** Insight/commodity categories used across filters, nav, and AI generation. */
export type Category = {
  slug: string;
  label: string;
  blurb: string;
};

export const categories: Category[] = [
  {
    slug: "Agriculture",
    label: "Agriculture",
    blurb: "KAMIS commodity prices — maize, beans, livestock and more, by market and county.",
  },
  {
    slug: "Macro",
    label: "Macro",
    blurb: "Inflation, the Central Bank Rate, GDP and other national indicators.",
  },
  {
    slug: "Forex",
    label: "Forex",
    blurb: "The shilling against the dollar and other major currencies.",
  },
  {
    slug: "Markets",
    label: "Markets",
    blurb: "Nairobi Securities Exchange activity and listed-company moves.",
  },
  {
    slug: "Trade",
    label: "Trade",
    blurb: "Imports, exports and Kenya's balance of trade.",
  },
  {
    slug: "Energy",
    label: "Energy",
    blurb: "Fuel prices, electricity tariffs and energy policy.",
  },
];

export function categoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
