// Next replaces a parent's `alternates`, `openGraph` and `twitter` objects wholesale,
// so every page that sets one of them repeats these shared fields.
export const rssAlternate = {"application/rss+xml":"https://www.changelog.earth/feed.xml"};
export const sharedOpenGraph = {siteName:"changelog.earth",type:"website",locale:"en_GB"} as const;
