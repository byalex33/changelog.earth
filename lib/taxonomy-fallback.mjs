// Fallback inference for stories that carry no structured fields. It pattern-matches a story's
// own text against the published vocabulary in ./taxonomy.mjs, so the vocabulary can be argued
// about in one module and these heuristics, which fail differently and get tuned differently,
// in another. Nothing here decides what is allowed; that is the vocabulary's job.
import { isChangeType, isDomain, isEvidenceStatus, isScope, isSignificance } from './taxonomy.mjs';

// Feed categories are editorial shortcuts. They map onto a domain without a model.
const CATEGORY_DOMAINS = new Map([
 ['science & nature','science'],['science','science'],['space','space'],['technology','technology'],['aviation','transport'],
 ['health','health'],['environment','ecology'],['energy','energy'],['positive news','ecology'],['world','society'],
]);
// Provider name as a last resort, when neither text nor feed category names a domain.
const providerDomain = provider => /space|spaceflight|nasa|esa/i.test(provider ?? '') ? 'space' : null;

// Ordered so the first match wins. These run against the headline and the publisher text of a
// story, and only unambiguous wording counts: a pattern that matches "bleaching resistance"
// labels a study about resilience as damage, which is worse than missing the story entirely.
// A withdrawal is deliberately absent: that happened to a paper, not to Earth, and the evidence
// status below is where it belongs.
const CHANGE_PATTERNS = [
 ['DAMAGED',/\b(destroyed|derelict|oil spill|wildfires? (?:burn|bare|strike)|deforestation|felled|contaminated|poisoned|crashed)\b/i],
 ['LOST',/\b(went extinct|declared extinct|died off|last known population of|extinction (?:of|confirmed)|disappeared entirely)\b/i],
 ['DECLINED',/\b(declined \d|decline[sd]? \d|fell \d|dropped \d|plummet\w*|shrank|shut down permanently|lowest (?:on record|since))\b/i],
 ['RESTORED',/\b(restored|restoration of|recolonis\w+|rewild\w+|reintroduced|back in the wild)\b/i],
 ['PROTECTED',/\b(designated|protected area|marine protected|sanctuary|protected under|conservation status (?:changed|improved))\b/i],
 ['CONFIRMED',/\b(confirmed|proves|proven to|validated by|now confirmed)\b/i],
 ['REVISED',/\b(revised|reassessment|rethink\w+|corrects? (?:earlier|a previous)|downgrad\w+)\b/i],
 ['DISCOVERED',/\b(new species|newly discovered|newly identified|previously unknown|scientifically described|discovered a new|first time ever recorded)\b/i],
 ['MEASURED',/\b(survey(?:s|ed)?|census|measured|record(?:ed|s)? the (?:highest|lowest)|study (?:found|reports|shows)|new (?:data|estimate|baseline|record))\b/i],
 ['EXPANDED',/\b(expanded|expansion of|increase[sd]? \d|grew by|grew \d|more than \d+%|doubled)\b/i],
 ['DEPLOYED',/\b(launched|deployed|commissioned|entered service|inaugurated|opened to the public|first (?:commercial )?(?:flight|operation)|goes? live)\b/i],
 ['IMPROVED',/\b(improv\w+|more efficient|breakthrough|reduced (?:emissions|deaths|costs) by)\b/i],
 ['UNDERSTOOD',/\b(how \w+ work|mechanism|first evidence|new insight|explains? why|now understood)\b/i],
 ['CREATED',/\b(built|created|developed|unveiled|introduced|invented|engineered|designed)\b/i],
];
// Domain words win over the feed category so 'Science & nature' does not swallow life and climate.
const DOMAIN_PATTERNS = [
 ['space',/\b(spacecraft|satellite|orbit|rocket|launch(?:es|ed)?|nasa|esa\b|roscosmos|ispace|mars|lunar|the moon|exoplanet|telescope|space station|astronom)\b/i],
 ['oceans',/\b(ocean|sea level|seabed|deep sea|coral reef|reef|marine|fisheries|whale|shark|krill|currents?)\b/i],
 ['life',/\b(species|genetic|genome|mutation|evolution|dna\b|protein|cell(?:ular)?|bacteria|microbiome|fertil\w+|breeding)\b/i],
 ['ecology',/\b(biodiversity|wildlife|conservation|rewild|endangered|extinct|pollinator|forest|rainforest|habitat|rewilding|rewilded|invasive species)\b/i],
 ['atmosphere',/\b(climate|emissions?|carbon|greenhouse|ozone|air quality|atmospher\w+|global warming|co2|so2|pm2\.5)\b/i],
 ['energy',/\b(solar|wind farm|wind power|renewable|battery|batteries|grid|nuclear|reactor|power plant|energy storage|hydrogen|fossil fuel|oil price|gas pipeline)\b/i],
 ['health',/\b(patient|patients|vaccine|disease|infection|cancer|tumou?r|hospital|clinical|therap\w+|mental health|malaria|outbreak|healthcare)\b/i],
 ['transport',/\b(airline|aircraft|airport|aviation|flight|railway|rail\b|train|shipping|vessel|ship\b|cargo fleet|trucking|electric vehicle)\b/i],
 ['agriculture',/\b(farm(?:er|ing|s)?\b|crop|harvest|livestock|wheat|rice|maize|soil|food security|aquaculture|fertili[sz]er)\b/i],
 ['archaeology',/\b(archaeolog\w+|ancient|excavat\w+|artifact|artefact|homini\w*|prehistor\w+|heritage site|fossil)\b/i],
 ['infrastructure',/\b(infrastructure|bridge|dam\b|water supply|city|urban|housing|building|road network|sewer)\b/i],
 ['technology',/\b(algorithm|artificial intelligence|\bai\b|chip|quantum comput\w+|robot\w*|software|open-?source|computing|cybersecurity|processor)\b/i],
 ['earth',/\b(earthquake|volcan\w+|mineral|mantle|tectonic|geomagnetic|seism\w+)\b/i],
];
// Existing patch labels remain the fallback so pre-taxonomy stories keep a sensible change type.
const KIND_CHANGE_TYPES = {Added:'CREATED',Unlocked:'UNDERSTOOD',Updated:'ONGOING',Changed:'ONGOING',Buffed:'IMPROVED',Improved:'IMPROVED',Nerfed:'DECLINED',Fixed:'RESTORED',Removed:'LOST',Patched:'IMPROVED'};
const SCOPE_PATTERNS = [
 ['planetary',/\b(globally|worldwide|global|planet-?wide|planetary|earth-?wide|across the world|every country)\b/i],
 ['regional',/\b(european|europe|african|africa|asia pacific|regional|continent-?wide)\b/i],
 ['local',/\b(a (?:single|local) (?:site|region|county|city|town)|locally)\b/i],
];
const EVIDENCE_PATTERNS = [
 ['retracted',/\b(retract(?:ed|ion)|withdrawn|journal (?:has )?(?:pulled|retracted)|paper pulled)\b/i],
 ['conflicting',/\b(contradict\w+|disput\w+|disagree\w+|debate[sd]? over)\b/i],
 ['revised',/\b(revised|correction|clarification|earlier report|updated? (?:story|report|findings))\b/i],
 ['preliminary',/\b(preliminary|early (?:data|results|stages?)|preprint|not yet peer|small (?:study|sample)|lab(?:oratory)?[- ]only|mouse (?:study|model)|mice studies|prototype|proposal)\b/i],
];

// Domain words first, then the feed category, then the provider, then science.
function inferDomain(text, category, provider) {
 for (const [id, pattern] of DOMAIN_PATTERNS) if (pattern.test(text)) return id;
 return CATEGORY_DOMAINS.get((category ?? '').toLowerCase()) ?? providerDomain(provider) ?? 'science';
}

// First unambiguous pattern wins; otherwise the existing patch label decides.
function inferChangeType(text, kind) {
 for (const [id, pattern] of CHANGE_PATTERNS) if (pattern.test(text)) return id;
 return KIND_CHANGE_TYPES[kind] ?? 'OBSERVED';
}
// Scope words win; a worldwide story is global unless the text narrows it.
function inferScope(text, worldwide) {
 for (const [id, pattern] of SCOPE_PATTERNS) if (pattern.test(text)) return id;
 return worldwide === true ? 'global' : 'local';
}
// Weak signals first, then explicit wording; anything unsettled stays preliminary.
function inferEvidenceStatus(text) {
 for (const [id, pattern] of EVIDENCE_PATTERNS) if (pattern.test(text)) return id;
 // A publisher summary is normal reporting, not corroboration: the absence of doubt must not read
 // as confirmation, so anything the patterns do not settle stays provisional.
 return 'preliminary';
}
// Editorial framework: how much of Earth is affected, how structural the change is,
// and whether independent reporting backs it. Not a numerical score, just a consistent ladder.
const KNOWLEDGE_CHANGES = new Set(['DISCOVERED','CONFIRMED','REVISED','LOST','DAMAGED','MEASURED']);
// Scope, change weight and independent sources, scored onto the ladder.
function inferSignificance({changeType, scope, sourceCount, evidenceStatus}) {
 const scopeWeight = scope === 'planetary' ? 3 : scope === 'global' ? 2 : scope === 'regional' ? 1 : 0;
 const changeWeight = KNOWLEDGE_CHANGES.has(changeType) ? 2 : changeType === 'OBSERVED' || changeType === 'ONGOING' ? 0 : 1;
 if (evidenceStatus === 'retracted' || evidenceStatus === 'conflicting') return 'minor';
 const score = scopeWeight + changeWeight + (sourceCount > 1 ? 1 : 0);
 if (score >= 6) return 'epochal';
 if (score >= 4) return 'major';
 if (score >= 2) return 'notable';
 return 'minor';
}

// Stories saved before the taxonomy existed carry no structured fields. They are classified from
// the same headline and the same bounded publisher text the classifier is given, so inferred and
// stored records rest on comparable evidence rather than on a headline alone.
export function classifyArticle(article, {sourceCount = 1} = {}) {
 const body = (article.summary || article.note || '').slice(0, 600);
 const text = `${article.originalTitle ?? ''} ${article.title} ${body}`;
 const domain = isDomain(article.domain) ? article.domain : inferDomain(text, article.category, article.provider);
 const changeType = isChangeType(article.changeType) ? article.changeType : inferChangeType(text, article.kind);
 const scope = isScope(article.scope) ? article.scope : inferScope(text, article.worldwide);
 const evidenceStatus = isEvidenceStatus(article.evidenceStatus) ? article.evidenceStatus : inferEvidenceStatus(text);
 const significance = isSignificance(article.significance) ? article.significance : inferSignificance({changeType, scope, sourceCount, evidenceStatus});
 return {domain, changeType, scope, significance, evidenceStatus};
}
