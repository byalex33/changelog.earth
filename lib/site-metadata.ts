// Next replaces a parent's `alternates`, `openGraph` and `twitter` objects wholesale,
// so every page that sets one of them repeats these shared fields.
export const rssAlternate = {"application/rss+xml":"https://www.changelog.earth/feed.xml"};
export const sharedOpenGraph = {siteName:"changelog.earth",type:"website",locale:"en_GB"} as const;
// A page that sets its own openGraph/twitter loses the inherited app/opengraph-image card, so it lists it here.
export const shareImage = {url:"/opengraph-image",width:1200,height:630,type:"image/png",alt:"Earth's Changelog: planetary release notes, written like game patch notes"};
