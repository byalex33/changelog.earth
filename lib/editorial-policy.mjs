export const TITLE_STYLE_VERSION = 5;
export const WORLDWIDE_POLICY = `Select worldwide-interest changes, not a collection of local stories from different countries. A publisher's country does not determine eligibility.
Include discoveries that change scientific knowledge, significant advances with applications beyond one location, international space missions, cross-border public-health milestones, and substantial recovery of globally threatened species. The supplied source must establish that broader significance.
Exclude local UK news and equivalent local-interest stories everywhere: council or neighbourhood improvements, a single park or reserve expansion or management handover, local transport routes, individual animal rescues, personal achievements, business bonuses, tourist attractions and promotional events. A location abroad, a large number, a world-famous person or the word 'first' alone does not make a story globally relevant.
Preserve the wholesome focus: useful progress, conservation and discoveries first. Skip war, crime, partisan politics, outrage, retrospectives, listicles and events with no identifiable new change. Do not infer worldwide importance just because a local policy might be copied elsewhere. When broader relevance is unclear, exclude. Never invent a global impact to justify inclusion.`;

export function isPublishedWorldwide(article) {
 return article.titleStyleVersion === TITLE_STYLE_VERSION && article.worldwide === true;
}
