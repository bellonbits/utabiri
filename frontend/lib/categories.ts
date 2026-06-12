/** Tab categories → which market categories (lib/data.ts) they include. */
export type Category = {
  slug: string;
  label: string;
  match: string[]; // Market.category values shown under this tab
  blurb: string;
};

export const categories: Category[] = [
  {
    slug: "politics",
    label: "Politics",
    match: ["Politics"],
    blurb: "Bills, appointments, county politics and government decisions.",
  },
  {
    slug: "sports",
    label: "Sports",
    match: ["Football", "FKF PL", "Athletics"],
    blurb: "Harambee Stars, FKF Premier League, athletics and global sport.",
  },
  {
    slug: "economy",
    label: "Economy",
    match: ["Economy", "Weather"],
    blurb: "CBK decisions, inflation, commodity prices and the shilling.",
  },
  {
    slug: "crypto",
    label: "Crypto",
    match: ["Crypto"],
    blurb: "Bitcoin, Ethereum and the wider digital-asset market.",
  },
  {
    slug: "elections",
    label: "Elections",
    match: ["Elections"],
    blurb: "2027 general election races, primaries and by-elections.",
  },
  {
    slug: "mentions",
    label: "Mentions",
    match: ["Mentions"],
    blurb: "Will they say it? Markets on speeches, interviews and posts.",
  },
  {
    slug: "creators",
    label: "Creators",
    match: ["Creators"],
    blurb: "Kenyan creators, music drops, YouTube milestones and more.",
  },
  {
    slug: "pop-culture",
    label: "Pop Culture",
    match: ["Pop Culture", "Entertainment"],
    blurb: "Awards, releases, reality TV and celebrity moments.",
  },
  {
    slug: "business",
    label: "Business",
    match: ["Business"],
    blurb: "Earnings, IPOs, M&A and corporate Kenya.",
  },
  {
    slug: "science",
    label: "Science",
    match: ["Science", "Technology"],
    blurb: "Space, AI, health and breakthrough research.",
  },
];

export function categoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
