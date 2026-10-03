// Structured vocabulary for Earth events. One place defines what can be classified,
// so collection, the archive, the API and every page agree on the same taxonomy.
export const DOMAINS = [
 {id:'life',label:'Life & biology',symbol:'🧬',topics:['New species','Extinctions','Evolution','Genetics','Microbiology','Conservation genetics']},
 {id:'earth',label:'Earth & geology',symbol:'🌍',topics:['Geology','Earthquakes','Volcanoes','Minerals','Continents','Geophysics']},
 {id:'oceans',label:'Oceans',symbol:'🌊',topics:['Coral reefs','Sea level','Currents','Deep sea','Fisheries','Ice']},
 {id:'atmosphere',label:'Atmosphere & climate',symbol:'🌡️',topics:['Climate','Emissions','Air quality','Ozone','Weather extremes','Forests']},
 {id:'ecology',label:'Ecology & biodiversity',symbol:'🌿',topics:['Biodiversity','Pollinators','Rewilding','Invasive species','Habitats','Wildlife']},
 {id:'science',label:'Science',symbol:'🔬',topics:['Physics','Chemistry','Materials','Mathematics','Research methods','Earth observation']},
 {id:'space',label:'Space',symbol:'🚀',topics:['Missions','Exoplanets','Launches','Space debris','Astronomy','Satellites']},
 {id:'energy',label:'Energy',symbol:'⚡',topics:['Renewables','Nuclear','Storage','Grid','Fossil fuels','Hydrogen']},
 {id:'technology',label:'Technology',symbol:'🛠️',topics:['Computing','Artificial intelligence','Robotics','Manufacturing','Telecommunications']},
 {id:'health',label:'Health',symbol:'🩺',topics:['Disease','Public health','Nutrition','Mental health','Medicine','Vaccination']},
 {id:'transport',label:'Transport',symbol:'✈️',topics:['Aviation','Rail','Shipping','Roads','Electric vehicles']},
 {id:'infrastructure',label:'Infrastructure',symbol:'🏗️',topics:['Cities','Bridges','Buildings','Dams','Water supply']},
 {id:'agriculture',label:'Agriculture & food',symbol:'🌾',topics:['Crops','Livestock','Soil','Food security','Aquaculture']},
 {id:'archaeology',label:'Archaeology & anthropology',symbol:'🏺',topics:['Archaeology','Anthropology','Prehistory','Heritage','Human evolution']},
 {id:'society',label:'Society',symbol:'👥',topics:['Demographics','Policy','Education','Migration','Languages']},
];

export const CHANGE_TYPES = [
 {id:'DISCOVERED',label:'Discovered',symbol:'+',definition:'Something previously unknown entered the record.'},
 {id:'CREATED',label:'Created',symbol:'+',definition:'Something new came into existence or was built.'},
 {id:'DEPLOYED',label:'Deployed',symbol:'+',definition:'Something reached real-world use at scale.'},
 {id:'MEASURED',label:'Measured',symbol:'~',definition:'A quantity or baseline was quantified.'},
 {id:'OBSERVED',label:'Observed',symbol:'~',definition:'An existing condition was witnessed or recorded.'},
 {id:'UNDERSTOOD',label:'Understood',symbol:'~',definition:'Existing knowledge changed about how or why something works.'},
 {id:'CONFIRMED',label:'Confirmed',symbol:'~',definition:'A previously provisional finding became established.'},
 {id:'REVISED',label:'Revised',symbol:'↻',definition:'An earlier claim, model or plan changed.'},
 {id:'ONGOING',label:'Ongoing',symbol:'~',definition:'Work, recovery or deployment continues without a clear end state.'},
 {id:'EXPANDED',label:'Expanded',symbol:'+',definition:'Coverage, capacity or range grew.'},
 {id:'IMPROVED',label:'Improved',symbol:'↑',definition:'A demonstrated performance or outcome got better.'},
 {id:'RESTORED',label:'Restored',symbol:'↑',definition:'Something damaged or lost returned to a working state.'},
 {id:'PROTECTED',label:'Protected',symbol:'⛨',definition:'Something gained formal or practical protection.'},
 {id:'DECLINED',label:'Declined',symbol:'↓',definition:'A measured quantity fell.'},
 {id:'DAMAGED',label:'Damaged',symbol:'↓',definition:'A known asset or system lost integrity or quality.'},
 {id:'LOST',label:'Lost',symbol:'-',definition:'Something that existed disappeared.'},
];

export const SCOPES = [
 {id:'local',label:'Local'},
 {id:'regional',label:'Regional'},
 {id:'global',label:'Global'},
 {id:'planetary',label:'Planetary'},
];

export const SIGNIFICANCE = [
 {id:'epochal',label:'Epochal',definition:'Exceptionally rare changes that alter our understanding or trajectory.',criteria:'A civilisational or planet-scale turning point. It changes what large numbers of people, or the biosphere, can rely on long term.'},
 {id:'major',label:'Major',definition:'Substantial real-world or scientific significance.',criteria:'A substantial and lasting change to a system, a population or shared scientific understanding.'},
 {id:'notable',label:'Notable',definition:'Meaningful within its field or community.',criteria:'A meaningful change worth recording within its field, region or community.'},
 {id:'minor',label:'Minor',definition:'Interesting but narrow.',criteria:'An interesting but limited change.'},
];
export const CONFIDENCE_IDS = ['high','medium','low'];

export const EVIDENCE_STATUS = [
 {id:'confirmed',label:'Confirmed',symbol:'✓',definition:'Reported as an established finding.'},
 {id:'preliminary',label:'Preliminary',symbol:'?',definition:'Early result, preprint or single reporting.'},
 {id:'conflicting',label:'Conflicting',symbol:'⚠',definition:'Sources disagree or the finding is disputed.'},
 {id:'revised',label:'Revised',symbol:'↻',definition:'A later report corrected or narrowed the claim.'},
 {id:'retracted',label:'Retracted',symbol:'✕',definition:'The claim was withdrawn.'},
];

export const DOMAIN_IDS = DOMAINS.map(domain => domain.id);
export const CHANGE_TYPE_IDS = CHANGE_TYPES.map(change => change.id);
export const SCOPE_IDS = SCOPES.map(scope => scope.id);
export const SIGNIFICANCE_IDS = SIGNIFICANCE.map(level => level.id);
export const EVIDENCE_IDS = EVIDENCE_STATUS.map(status => status.id);
// Sets, built once: validation runs per story and per stored record, so it cannot allocate.
const domainIds = new Set(DOMAIN_IDS), changeTypeIds = new Set(CHANGE_TYPE_IDS), scopeIds = new Set(SCOPE_IDS), significanceIds = new Set(SIGNIFICANCE_IDS), evidenceIds = new Set(EVIDENCE_IDS);
// Domain id membership.
export const isDomain = value => domainIds.has(value);
// Change-type id membership.
export const isChangeType = value => changeTypeIds.has(value);
// Scope id membership.
export const isScope = value => scopeIds.has(value);
// Significance level membership.
export const isSignificance = value => significanceIds.has(value);
// Evidence status membership.
export const isEvidenceStatus = value => evidenceIds.has(value);
// Bounded plain text: non-empty and within the field's length limit.
export const isPlainText = (value, max = 400) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
// Lowercase slug for cluster keys, so several reports of one event share one.
export const isSlug = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
