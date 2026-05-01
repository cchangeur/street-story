const elements = {
  locateButton: document.querySelector('#locateButton'),
  demoButton: document.querySelector('#demoButton'),
  manualAddressForm: document.querySelector('#manualAddressForm'),
  manualAddressInput: document.querySelector('#manualAddressInput'),
  manualAddressButton: document.querySelector('#manualAddressButton'),
  statusText: document.querySelector('#statusText'),
  addressText: document.querySelector('#addressText'),
  streetText: document.querySelector('#streetText'),
  queryText: document.querySelector('#queryText'),
  storyCard: document.querySelector('#storyCard'),
  storyImage: document.querySelector('#storyImage'),
  storyType: document.querySelector('#storyType'),
  storyTitle: document.querySelector('#storyTitle'),
  storyDescription: document.querySelector('#storyDescription'),
  storyBullets: document.querySelector('#storyBullets'),
  storyRelatedWrap: document.querySelector('#storyRelatedWrap'),
  storyRelated: document.querySelector('#storyRelated'),
  storySources: document.querySelector('#storySources'),
  errorCard: document.querySelector('#errorCard'),
  errorText: document.querySelector('#errorText'),
};

const COMMON_STREET_PREFIXES = [
  'rue',
  'avenue',
  'av',
  'boulevard',
  'bd',
  'allée',
  'allee',
  'impasse',
  'place',
  'chemin',
  'route',
  'quai',
  'cours',
  'promenade',
  'esplanade',
  'square',
  'passage',
  'faubourg',
  'villa',
  'cité',
  'cite',
  'sentier',
];

const COMMON_TITLES = [
  'général',
  'general',
  'maréchal',
  'marechal',
  'docteur',
  'docteure',
  'doctoresse',
  'professeur',
  'président',
  'president',
  'commandant',
  'capitaine',
  'colonel',
  'saint',
  'sainte',
  'abbé',
  'abbe',
  'frère',
  'frere',
  'amiral',
];

const SPECIAL_ALIASES = new Map([
  ['général de gaulle', ['Charles de Gaulle']],
  ['general de gaulle', ['Charles de Gaulle']],
  ['de gaulle', ['Charles de Gaulle']],
  ['président kennedy', ['John Fitzgerald Kennedy', 'John F. Kennedy']],
  ['president kennedy', ['John Fitzgerald Kennedy', 'John F. Kennedy']],
  ['maréchal leclerc', ['Philippe Leclerc de Hauteclocque', 'Leclerc']],
  ['marechal leclerc', ['Philippe Leclerc de Hauteclocque', 'Leclerc']],
]);

const WIKIDATA_PROPERTY_LABELS = {
  P31: 'Type',
  P27: 'Nationalité',
  P39: 'Fonction',
  P106: 'Activité',
  P26: 'Conjoint·e',
  P463: 'Organisation',
};

init();

function init() {
  elements.locateButton.addEventListener('click', handleLocateClick);
  elements.demoButton.addEventListener('click', handleDemoClick);
  elements.manualAddressForm.addEventListener('submit', handleManualAddressSubmit);
}

async function handleLocateClick() {
  if (!navigator.geolocation) {
    showError("La géolocalisation n'est pas disponible sur ce navigateur.");
    return;
  }

  setLoading(true, 'Demande de géolocalisation...');

  try {
    const position = await getCurrentPosition();
    await loadStoryFromCoordinates({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      sourceLabel: 'Ta position actuelle',
    });
  } catch (error) {
    console.error(error);
    showError(
      error?.message ||
        "Impossible de récupérer ta position. Vérifie les permissions de géolocalisation.",
    );
  } finally {
    setLoading(false);
  }
}

async function handleDemoClick() {
  setLoading(true, 'Chargement de l’exemple...');

  try {
    await loadStoryFromCoordinates({
      lat: 48.8566,
      lng: 2.3522,
      sourceLabel: 'Paris, Hôtel de Ville',
    });
  } catch (error) {
    console.error(error);
    showError(error?.message || "Impossible de charger l'exemple.");
  } finally {
    setLoading(false);
  }
}

async function handleManualAddressSubmit(event) {
  event.preventDefault();

  const query = normalizeSpacing(elements.manualAddressInput.value || '');
  if (!query) {
    showError('Saisis une adresse pour lancer la recherche manuelle.');
    return;
  }

  setLoading(true, `Recherche de l’adresse “${query}”...`);

  try {
    const address = await geocodeAddress(query);
    await loadStoryFromAddress({ address, sourceLabel: 'ton adresse saisie' });
  } catch (error) {
    console.error(error);
    showError(error?.message || "Impossible de traiter l'adresse saisie.");
  } finally {
    setLoading(false);
  }
}

async function loadStoryFromCoordinates({ lat, lng, sourceLabel }) {
  hideError();
  hideStory();
  setStatus(`Recherche de l'adresse via ${sourceLabel}...`);

  const address = await reverseGeocode(lat, lng);
  await loadStoryFromAddress({ address, sourceLabel });
}

async function loadStoryFromAddress({ address, sourceLabel }) {
  hideError();
  hideStory();
  setStatus(`Analyse de l'adresse via ${sourceLabel}...`);
  renderAddress(address);

  const searchCandidates = buildStreetSearchCandidates(address.street || address.name || '');
  if (searchCandidates.length === 0) {
    throw new Error("Impossible d'exploiter le nom de rue détecté.");
  }

  let story = null;
  for (const query of searchCandidates) {
    setStatus(`Recherche de “${query}” dans Wikipédia...`);
    elements.queryText.textContent = query;
    story = await searchWikipediaStory(query);
    if (story) {
      break;
    }
  }

  if (!story) {
    throw new Error(
      "Je n'ai pas trouvé d'entité exploitable pour cette rue. Il faudra ajouter un fallback ou un override manuel.",
    );
  }

  const enrichedStory = story.wikidataId ? await enrichFromWikidata(story) : story;
  renderStory(enrichedStory, address);
  setStatus('Fiche générée.');
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60_000,
    });
  });
}

async function reverseGeocode(lat, lng) {
  const url = new URL('https://data.geopf.fr/geocodage/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('limit', '1');
  url.searchParams.set('index', 'address');

  const data = await fetchJson(url);
  const feature = data?.features?.[0];
  if (!feature?.properties) {
    throw new Error("Aucune adresse exploitable n'a été trouvée pour cette position.");
  }

  return feature.properties;
}

async function geocodeAddress(query) {
  const url = new URL('https://data.geopf.fr/geocodage/search');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '1');
  url.searchParams.set('index', 'address');

  const data = await fetchJson(url);
  const feature = data?.features?.[0];
  if (!feature?.properties) {
    throw new Error("Aucune adresse exploitable n'a été trouvée pour cette saisie.");
  }

  return feature.properties;
}

function buildStreetSearchCandidates(streetName) {
  const cleanStreet = normalizeSpacing(streetName);
  if (!cleanStreet) return [];

  const candidates = new Set([cleanStreet]);
  let stripped = cleanStreet;

  const streetPrefixPattern = new RegExp(
    `^(?:${COMMON_STREET_PREFIXES.map(escapeRegExp).join('|')})\\s+`,
    'i',
  );
  stripped = stripped.replace(streetPrefixPattern, '');
  stripped = stripped.replace(/^[dl]['’]\s*/i, '');
  stripped = stripped.replace(/^(de|du|des|de la|de l')\s+/i, '');

  const titlePattern = new RegExp(
    `^(?:${COMMON_TITLES.map(escapeRegExp).join('|')})\\s+`,
    'i',
  );

  const withoutTitle = stripped.replace(titlePattern, '');

  [stripped, withoutTitle].forEach((value) => {
    const normalized = normalizeSpacing(value.replace(/-/g, ' '));
    if (normalized) candidates.add(normalized);
  });

  const aliasKey = normalizeForAlias(stripped);
  const aliasKeyWithoutTitle = normalizeForAlias(withoutTitle);
  for (const key of [aliasKey, aliasKeyWithoutTitle]) {
    const aliases = SPECIAL_ALIASES.get(key);
    if (aliases) {
      aliases.forEach((alias) => candidates.add(alias));
    }
  }

  return Array.from(candidates).filter(Boolean);
}

async function searchWikipediaStory(query) {
  const url = new URL('https://fr.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '5',
    prop: 'extracts|pageimages|pageprops|info',
    exintro: '1',
    explaintext: '1',
    exchars: '1200',
    inprop: 'url',
    piprop: 'thumbnail|original',
    pithumbsize: '1400',
    format: 'json',
    origin: '*',
  }).toString();

  const data = await fetchJson(url);
  const pages = Object.values(data?.query?.pages || {}).sort(
    (a, b) => (a.index ?? 999) - (b.index ?? 999),
  );

  const page = pages.find((candidate) => !isDisambiguation(candidate));
  if (!page) {
    return null;
  }

  return {
    title: page.title,
    extract: page.extract || '',
    wikipediaUrl: page.fullurl,
    imageUrl: page.original?.source || page.thumbnail?.source || '',
    wikidataId: page.pageprops?.wikibase_item || null,
    query,
  };
}

async function enrichFromWikidata(story) {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'wbgetentities',
    ids: story.wikidataId,
    props: 'labels|descriptions|claims',
    languages: 'fr',
    format: 'json',
    origin: '*',
  }).toString();

  const data = await fetchJson(url);
  const entity = data?.entities?.[story.wikidataId];
  if (!entity) {
    return story;
  }

  const referencedEntityIds = new Set();
  for (const propertyId of ['P31', 'P27', 'P39', 'P106', 'P26', 'P463']) {
    for (const claim of entity.claims?.[propertyId] || []) {
      const id = claim?.mainsnak?.datavalue?.value?.id;
      if (id) referencedEntityIds.add(id);
    }
  }

  const resolvedLabels = referencedEntityIds.size
    ? await resolveEntityLabels(Array.from(referencedEntityIds))
    : {};

  return {
    ...story,
    wikidata: entity,
    relatedLabels: resolvedLabels,
  };
}

async function resolveEntityLabels(ids) {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'labels',
    languages: 'fr',
    format: 'json',
    origin: '*',
  }).toString();

  const data = await fetchJson(url);
  const labels = {};

  for (const [id, entity] of Object.entries(data?.entities || {})) {
    labels[id] = entity?.labels?.fr?.value || id;
  }

  return labels;
}

function renderAddress(address) {
  const label = address.label || `${address.name || ''} ${address.city || ''}`.trim();
  elements.addressText.textContent = label || 'Adresse inconnue';
  elements.streetText.textContent = address.street || address.name || '-';
}

function renderStory(story, address) {
  const description =
    story.wikidata?.descriptions?.fr?.value || firstSentence(story.extract) || 'Description indisponible.';
  const typeLabel =
    story.wikidata ? getPropertyValues(story.wikidata, story.relatedLabels, 'P31', 2).join(' · ') : '';
  const bullets = buildBullets(story);
  const related = buildRelatedItems(story);

  elements.storyType.textContent = typeLabel || 'Entité liée au nom de rue';
  elements.storyTitle.textContent = story.title;
  elements.storyDescription.textContent = description;

  if (story.imageUrl) {
    elements.storyImage.src = story.imageUrl;
    elements.storyImage.alt = story.title;
    elements.storyImage.classList.remove('hidden');
  } else {
    elements.storyImage.removeAttribute('src');
    elements.storyImage.alt = 'Aucune illustration disponible';
    elements.storyImage.classList.add('hidden');
  }

  elements.storyBullets.innerHTML = '';
  bullets.forEach((bullet) => {
    const li = document.createElement('li');
    li.textContent = bullet;
    elements.storyBullets.appendChild(li);
  });

  elements.storyRelated.innerHTML = '';
  if (related.length > 0) {
    related.forEach((label) => {
      const span = document.createElement('span');
      span.className = 'related-pill';
      span.textContent = label;
      elements.storyRelated.appendChild(span);
    });
    elements.storyRelatedWrap.classList.remove('hidden');
  } else {
    elements.storyRelatedWrap.classList.add('hidden');
  }

  elements.storySources.innerHTML = '';
  const sources = [
    { label: 'Wikipédia', href: story.wikipediaUrl },
    story.wikidataId
      ? { label: 'Wikidata', href: `https://www.wikidata.org/wiki/${story.wikidataId}` }
      : null,
    {
      label: 'Adresse détectée',
      href: `https://www.openstreetmap.org/search?query=${encodeURIComponent(address.label || address.name || '')}`,
    },
  ].filter(Boolean);

  sources.forEach((source) => {
    const link = document.createElement('a');
    link.className = 'source-link';
    link.href = source.href;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    link.textContent = source.label;
    elements.storySources.appendChild(link);
  });

  elements.storyCard.classList.remove('hidden');
}

function buildBullets(story) {
  const bullets = [];
  const entity = story.wikidata;

  if (entity) {
    const birth = getFirstTimeClaim(entity, 'P569');
    const death = getFirstTimeClaim(entity, 'P570');
    if (birth || death) {
      bullets.push(
        [birth ? `Naissance : ${birth}` : null, death ? `Décès : ${death}` : null]
          .filter(Boolean)
          .join(' · '),
      );
    }

    const occupations = getPropertyValues(entity, story.relatedLabels, 'P106', 3);
    if (occupations.length) {
      bullets.push(`Activité : ${occupations.join(', ')}`);
    }

    const functions = getPropertyValues(entity, story.relatedLabels, 'P39', 3);
    if (functions.length) {
      bullets.push(`Fonction : ${functions.join(', ')}`);
    }

    const countries = getPropertyValues(entity, story.relatedLabels, 'P27', 2);
    if (countries.length) {
      bullets.push(`Nationalité / pays : ${countries.join(', ')}`);
    }
  }

  const summarySentences = splitIntoSentences(story.extract)
    .filter((sentence) => sentence.length > 35)
    .slice(0, 4);

  for (const sentence of summarySentences) {
    if (bullets.length >= 5) break;
    if (!bullets.some((bullet) => bullet.includes(sentence))) {
      bullets.push(sentence);
    }
  }

  return uniqueValues(bullets).slice(0, 5);
}

function buildRelatedItems(story) {
  if (!story.wikidata) return [];

  const related = [
    ...getPropertyValues(story.wikidata, story.relatedLabels, 'P26', 2),
    ...getPropertyValues(story.wikidata, story.relatedLabels, 'P463', 3),
  ];

  return uniqueValues(related).slice(0, 5);
}

function getPropertyValues(entity, resolvedLabels, propertyId, limit = 3) {
  const claims = entity?.claims?.[propertyId] || [];
  const values = [];

  for (const claim of claims) {
    const dataValue = claim?.mainsnak?.datavalue?.value;
    if (!dataValue) continue;

    if (dataValue.id) {
      values.push(resolvedLabels?.[dataValue.id] || dataValue.id);
    } else if (typeof dataValue === 'string') {
      values.push(dataValue);
    }

    if (values.length >= limit) break;
  }

  return uniqueValues(values);
}

function getFirstTimeClaim(entity, propertyId) {
  const claim = entity?.claims?.[propertyId]?.[0];
  const time = claim?.mainsnak?.datavalue?.value?.time;
  if (!time) return '';

  const match = time.match(/^([+-]\d{4,})-(\d{2})-(\d{2})T/);
  if (!match) return time;

  const [, year, month, day] = match;
  const iso = `${year.replace('+', '')}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date);
}

function isDisambiguation(page) {
  const title = page?.title?.toLowerCase() || '';
  const extract = page?.extract?.toLowerCase() || '';
  return title.includes('homonymie') || extract.includes('peut désigner') || extract.includes('fait référence à');
}

function splitIntoSentences(text) {
  return normalizeSpacing(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function firstSentence(text) {
  return splitIntoSentences(text)[0] || '';
}

function normalizeSpacing(value) {
  return value.replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
}

function normalizeForAlias(value) {
  return normalizeSpacing(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}`);
  }
  return response.json();
}

function setLoading(isLoading, message = 'Chargement...') {
  elements.locateButton.disabled = isLoading;
  elements.demoButton.disabled = isLoading;
  elements.manualAddressInput.disabled = isLoading;
  elements.manualAddressButton.disabled = isLoading;
  if (isLoading) {
    setStatus(message);
  }
}

function setStatus(message) {
  elements.statusText.textContent = message;
}

function showError(message) {
  hideStory();
  elements.errorText.textContent = message;
  elements.errorCard.classList.remove('hidden');
  setStatus('Échec.');
}

function hideError() {
  elements.errorCard.classList.add('hidden');
  elements.errorText.textContent = '';
}

function hideStory() {
  elements.storyCard.classList.add('hidden');
}
