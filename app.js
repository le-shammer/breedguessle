const MAX_GUESSES = 6;
const BREED_DATA_URL = "./fci_hunderassen_normalisiert.json";
const CONTINENT_DATA_URL = "./country-by-continent.json";
const FCI_CLASSIFICATION_URL = "./fci_group_sections.json";

const countryAliases = new Map(
  Object.entries({
    "afghanistan": "Afghanistan",
    "albanien": "Albania",
    "algerien": "Algeria",
    "argentinien": "Argentina",
    "australien": "Australia",
    "österreich": "Austria",
    "belgien": "Belgium",
    "bosnien und herzegowina": "Bosnia and Herzegovina",
    "brasilien": "Brazil",
    "china": "China",
    "deutschland": "Germany",
    "dänemark": "Denmark",
    "england": "England",
    "estland": "Estonia",
    "finnland": "Finland",
    "frankreich": "France",
    "griechenland": "Greece",
    "großbritannien": "United Kingdom",
    "grönland": "Greenland",
    "indonesien": "Indonesia",
    "irland": "Ireland",
    "island": "Iceland",
    "israel": "Israel",
    "italien": "Italy",
    "japan": "Japan",
    "kanada": "Canada",
    "kasachstan": "Kazakhstan",
    "kolumbien": "Colombia",
    "kroatien": "Croatia",
    "kuba": "Cuba",
    "madagaskar": "Madagascar",
    "mali": "Mali",
    "malta": "Malta",
    "marokko": "Morocco",
    "mazedonien": "North Macedonia",
    "mexiko": "Mexico",
    "montenegro": "Montenegro",
    "nahost": "Asia",
    "niederlande": "Netherlands",
    "nordmazedonien": "North Macedonia",
    "norwegen": "Norway",
    "peru": "Peru",
    "polen": "Poland",
    "portugal": "Portugal",
    "republik korea": "South Korea",
    "rumänien": "Romania",
    "russland": "Russia",
    "schweden": "Sweden",
    "schweiz": "Switzerland",
    "serbien": "Serbia",
    "slowakei": "Slovakia",
    "slowenien": "Slovenia",
    "spanien": "Spain",
    "südafrika": "South Africa",
    "taiwan": "Asia",
    "thailand": "Thailand",
    "tibet": "Asia",
    "tschechien": "Czech Republic",
    "tschechische republik": "Czech Republic",
    "türkei": "Turkey",
    "ungarn": "Hungary",
    "uruguay": "Uruguay",
    "vereinigte staaten von amerika": "United States",
    "zentralafrika": "Africa",
    "zentraler mittelmeerraum": "Europe",
    "anatolien": "Asia",
  }).map(([name, canonical]) => [normalizeText(name), canonical]),
);

const elements = {
  titleDate: document.querySelector("#today-label"),
  attemptCount: document.querySelector("#attempt-count"),
  attemptTrack: document.querySelector("#attempt-track"),
  input: document.querySelector("#breed-search"),
  suggestions: document.querySelector("#breed-suggestions"),
  submit: document.querySelector("#guess-button"),
  message: document.querySelector("#form-message"),
  live: document.querySelector("#live-message"),
  guesses: document.querySelector("#guesses-body"),
  empty: document.querySelector("#empty-row"),
  result: document.querySelector("#round-result"),
  resultEyebrow: document.querySelector("#result-eyebrow"),
  resultTitle: document.querySelector("#result-title"),
  resultDetail: document.querySelector("#result-detail"),
  resultImage: document.querySelector("#result-image"),
  resultImageWrap: document.querySelector("#result-image-wrap"),
  shareButton: document.querySelector("#share-button"),
};

let breeds = [];
let continents = new Map();
let fciClassification = {};
let targetIndex = -1;
let guesses = [];
let selectedIndex = -1;
let suggestionResults = [];
let completed = false;
let currentDateKey = "";
let requestedImageIndex = -1;

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hashSeed(text) {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) | 0;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function dateParts(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const dayOfYear = Math.floor(
    (Date.UTC(year, month, day) - Date.UTC(year, 0, 0)) / 86400000,
  );
  return { year, month, day, dayOfYear };
}

function shuffledForYear(year) {
  const shuffled = breeds.map((_, index) => index);
  const random = seededRandom(hashSeed(`BreedGuessle:${year}`));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function storageKey(dateKey) {
  return `breedguessle:${dateKey}`;
}

function readSavedGuesses(dateKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(dateKey)) ?? "[]");
    return Array.isArray(saved)
      ? saved.filter((index) => Number.isInteger(index) && index >= 0 && index < breeds.length).slice(0, MAX_GUESSES)
      : [];
  } catch {
    return [];
  }
}

function saveGuesses() {
  try {
    localStorage.setItem(storageKey(currentDateKey), JSON.stringify(guesses));
  } catch {
    elements.message.textContent = "Der Spielstand kann in diesem Browser nicht gespeichert werden.";
  }
}

function measurementRange(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d+(?:,\d+)?)(?:\s*-\s*(\d+(?:,\d+)?))?$/);
  if (!match) return null;
  const minimum = Number(match[1].replace(",", "."));
  const maximum = Number((match[2] ?? match[1]).replace(",", "."));
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return null;
  return { minimum: Math.min(minimum, maximum), maximum: Math.max(minimum, maximum) };
}

function meanOf(range) {
  return range ? (range.minimum + range.maximum) / 2 : null;
}

function formatNumber(value) {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value);
}

function formatMeasurement(value, unit) {
  const range = measurementRange(value);
  if (!range) return null;
  return `${formatNumber(meanOf(range))} ${unit}`;
}

function levenshteinDistance(first, second) {
  if (!first.length) return second.length;
  if (!second.length) return first.length;
  let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= second.length; column += 1) {
      const substitution = previous[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1);
      current[column] = Math.min(previous[column] + 1, current[column - 1] + 1, substitution);
    }
    previous = current;
  }
  return previous[second.length];
}

function textSimilarity(first, second) {
  if (!first || !second) return 0;
  if (first === second) return 1;
  if (first.includes(second) || second.includes(first)) {
    return Math.min(first.length, second.length) / Math.max(first.length, second.length) * 0.25 + 0.75;
  }
  return 1 - levenshteinDistance(first, second) / Math.max(first.length, second.length);
}

function breedSimilarity(query, breed) {
  const name = normalizeText(breed.name);
  const words = name.split(" ");
  return Math.max(textSimilarity(name, query), ...words.map((word) => textSimilarity(word, query)));
}

function findSuggestions(query) {
  const normalizedQuery = normalizeText(query);
  if (normalizedQuery.length < 2) return [];
  return breeds
    .map((breed, index) => ({ index, breed, score: breedSimilarity(normalizedQuery, breed) }))
    .filter(({ score }) => score >= 0.42)
    .sort((first, second) => second.score - first.score || first.breed.name.localeCompare(second.breed.name, "de"))
    .slice(0, 7);
}

function renderSuggestions() {
  const query = elements.input.value;
  suggestionResults = findSuggestions(query);
  selectedIndex = suggestionResults.length ? 0 : -1;
  elements.suggestions.replaceChildren();

  if (!suggestionResults.length) {
    elements.suggestions.hidden = true;
    elements.input.setAttribute("aria-expanded", "false");
    return;
  }

  for (const [position, result] of suggestionResults.entries()) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `suggestion${position === selectedIndex ? " selected" : ""}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(position === selectedIndex));
    const name = document.createElement("span");
    name.className = "suggestion-name";
    name.textContent = result.breed.name;
    const meta = document.createElement("span");
    meta.className = "suggestion-meta";
    meta.textContent = `FCI ${result.breed.fci_nummer}`;
    option.append(name, meta);
    option.addEventListener("click", () => selectSuggestion(position));
    elements.suggestions.append(option);
  }

  elements.suggestions.hidden = false;
  elements.input.setAttribute("aria-expanded", "true");
  elements.submit.disabled = true;
}

function selectSuggestion(position) {
  const suggestion = suggestionResults[position];
  if (!suggestion) return;
  selectedIndex = position;
  elements.input.value = suggestion.breed.name;
  elements.input.dataset.selectedIndex = String(suggestion.index);
  elements.suggestions.hidden = true;
  elements.input.setAttribute("aria-expanded", "false");
  elements.submit.disabled = completed;
  elements.message.textContent = "";
  elements.input.focus();
}

function setSelectedSuggestion(position) {
  if (!suggestionResults.length) return;
  selectedIndex = (position + suggestionResults.length) % suggestionResults.length;
  for (const [index, option] of [...elements.suggestions.children].entries()) {
    option.classList.toggle("selected", index === selectedIndex);
    option.setAttribute("aria-selected", String(index === selectedIndex));
  }
}

function originParts(origin) {
  if (!origin) return [];
  return origin.split(",").map((part) => part.trim()).filter(Boolean);
}

function canonicalOriginPart(part) {
  const normalized = normalizeText(part);
  return countryAliases.get(normalized) ?? part.trim();
}

function originIdentity(origin) {
  const parts = originParts(origin);
  if (!parts.length) return null;
  return parts.map(canonicalOriginPart).sort((first, second) => first.localeCompare(second)).join("|");
}

function originContinents(origin) {
  const result = new Set();
  for (const part of originParts(origin)) {
    const canonical = canonicalOriginPart(part);
    const continent = continents.get(normalizeText(canonical));
    if (continent) result.add(continent);
    else if (["Asia", "Africa", "Europe", "North America", "South America", "Oceania"].includes(canonical)) result.add(canonical);
  }
  return result;
}

function compareOrigin(guess, target) {
  if (!guess.herkunftsland || !target.herkunftsland) return { status: "unknown", symbol: "?" };
  if (originIdentity(guess.herkunftsland) === originIdentity(target.herkunftsland)) {
    return { status: "right", symbol: "✓" };
  }
  const guessedContinents = originContinents(guess.herkunftsland);
  const targetContinents = originContinents(target.herkunftsland);
  if (!guessedContinents.size || !targetContinents.size) return { status: "unknown", symbol: "?" };
  return [...guessedContinents].some((continent) => targetContinents.has(continent))
    ? { status: "near", symbol: "≈" }
    : { status: "wrong", symbol: "×" };
}

function compareFci(guess, target) {
  if (guess.gruppe == null || target.gruppe == null || !guess.sektion || !target.sektion) {
    return { status: "unknown", symbol: "?" };
  }
  if (Number(guess.gruppe) === Number(target.gruppe) && String(guess.sektion) === String(target.sektion)) {
    return { status: "right", symbol: "✓" };
  }
  if (Number(guess.gruppe) === Number(target.gruppe)) return { status: "near", symbol: "≈" };
  return { status: "wrong", symbol: "×" };
}

function classificationLabels(breed) {
  const group = fciClassification[String(breed.gruppe)];
  const sectionName = group?.sections?.[String(breed.sektion)];
  if (!group || !sectionName) return null;
  return { group: group.name, section: sectionName };
}

function renderFciCell(breed, comparison) {
  const cell = document.createElement("div");
  cell.className = `cell ${comparison.status}`;
  const labels = classificationLabels(breed);
  if (!labels) {
    const unknown = document.createElement("span");
    unknown.className = "value";
    unknown.textContent = "Unbekannt";
    cell.append(unknown);
  } else {
    const groupLine = document.createElement("span");
    groupLine.className = "value fci-line";
    groupLine.textContent = `${breed.gruppe} · ${labels.group}`;
    const sectionLine = document.createElement("span");
    sectionLine.className = "fci-section";
    sectionLine.textContent = `${breed.sektion} · ${labels.section}`;
    cell.append(groupLine, sectionLine);
  }
  const status = document.createElement("span");
  status.className = "status";
  status.setAttribute("role", "img");
  const statusNames = { right: "Richtig", near: "Nah dran", wrong: "Falsch", unknown: "Unbekannt" };
  status.setAttribute("aria-label", `Gruppe und Sektion: ${statusNames[comparison.status]}`);
  const symbol = document.createElement("span");
  symbol.className = "status-symbol";
  symbol.setAttribute("aria-hidden", "true");
  symbol.textContent = comparison.symbol;
  status.append(symbol);
  cell.append(status);
  return cell;
}

function compareMeasurement(guessValue, targetValue, unit) {
  const guessedRange = measurementRange(guessValue);
  const targetRange = measurementRange(targetValue);
  if (!guessedRange || !targetRange) return { status: "unknown", symbol: "?", display: null };

  const guessedMean = meanOf(guessedRange);
  const targetMean = meanOf(targetRange);
  const display = formatMeasurement(guessValue, unit);
  if (Math.abs(guessedMean - targetMean) < 0.000001) {
    return { status: "right", symbol: "✓", display };
  }

  if (targetRange.minimum === targetRange.maximum) {
    const tolerance = targetMean * 0.1;
    if (guessedMean >= targetMean - tolerance && guessedMean <= targetMean + tolerance) {
      return { status: "near", symbol: guessedMean < targetMean ? "↑" : "↓", display };
    }
  } else if (guessedMean >= targetRange.minimum && guessedMean <= targetRange.maximum) {
    return { status: "near", symbol: guessedMean < targetMean ? "↑" : "↓", display };
  }

  return {
    status: "wrong",
    symbol: guessedMean < targetRange.minimum ? "↑" : "↓",
    display,
  };
}

function renderCell(value, comparison, label) {
  const cell = document.createElement("div");
  cell.className = `cell ${comparison.status}`;
  const valueElement = document.createElement("span");
  valueElement.className = "value";
  valueElement.textContent = value ?? "Unbekannt";
  const status = document.createElement("span");
  status.className = "status";
  status.setAttribute("role", "img");
  const direction = comparison.symbol === "↑" ? ", gesuchter Wert ist größer" : comparison.symbol === "↓" ? ", gesuchter Wert ist kleiner" : "";
  const statusNames = { right: "Richtig", near: "Nah dran", wrong: "Falsch", unknown: "Unbekannt" };
  status.setAttribute("aria-label", `${label}: ${statusNames[comparison.status]}${direction}`);
  const symbol = document.createElement("span");
  symbol.className = "status-symbol";
  symbol.setAttribute("aria-hidden", "true");
  symbol.textContent = comparison.symbol;
  status.append(symbol);
  cell.append(valueElement, status);
  return cell;
}

function renderGuess(breedIndex, position) {
  const breed = breeds[breedIndex];
  const target = breeds[targetIndex];
  const row = document.createElement("tr");
  const nameCell = document.createElement("th");
  nameCell.scope = "row";
  const number = document.createElement("span");
  number.className = "guess-number";
  number.textContent = `TIPP ${String(position + 1).padStart(2, "0")}`;
  const name = document.createElement(breed.url ? "a" : "span");
  name.className = "breed-name";
  name.textContent = breed.name;
  if (breed.url) {
    name.href = breed.url;
    name.target = "_blank";
    name.rel = "noopener noreferrer";
  }
  nameCell.append(number, name);
  row.append(nameCell);

  const values = [
    { label: "Herkunft", value: breed.herkunftsland ?? "Unbekannt", comparison: compareOrigin(breed, target) },
    { label: "Größe", value: formatMeasurement(breed.groesse, "cm"), comparison: compareMeasurement(breed.groesse, target.groesse, "cm") },
    { label: "Gewicht", value: formatMeasurement(breed.gewicht, "kg"), comparison: compareMeasurement(breed.gewicht, target.gewicht, "kg") },
  ];

  const originCell = document.createElement("td");
  originCell.dataset.label = "Herkunft";
  originCell.append(renderCell(values[0].value, values[0].comparison, values[0].label));
  row.append(originCell);

  const fciCell = document.createElement("td");
  fciCell.dataset.label = "Gruppe / Sektion";
  fciCell.append(renderFciCell(breed, compareFci(breed, target)));
  row.append(fciCell);

  for (const item of values.slice(1)) {
    const cell = document.createElement("td");
    cell.dataset.label = item.label;
    cell.append(renderCell(item.value, item.comparison, item.label));
    row.append(cell);
  }
  return row;
}

function updateAttempts() {
  elements.attemptCount.textContent = String(guesses.length);
  elements.attemptTrack.replaceChildren();
  for (let index = 0; index < MAX_GUESSES; index += 1) {
    const mark = document.createElement("i");
    if (index < guesses.length) mark.className = "used";
    elements.attemptTrack.append(mark);
  }
  elements.attemptTrack.setAttribute("aria-label", `${guesses.length} von ${MAX_GUESSES} Versuchen`);
}

function loadTargetImage(breed, breedIndex) {
  if (targetIndex !== breedIndex || !breed.image_url) return;

  const blurAmount = Math.max(0, 20 - guesses.length * 4);
  elements.resultImage.style.filter = `blur(${blurAmount}px)`;
  if (requestedImageIndex === breedIndex) return;

  requestedImageIndex = breedIndex;
  elements.resultImage.src = breed.image_thumbnail_url ?? breed.image_url;
  elements.resultImage.alt = "Bildhinweis zur gesuchten Hunderasse";
  elements.resultImageWrap.hidden = false;
}

function renderGame() {
  elements.guesses.replaceChildren();
  if (!guesses.length) {
    elements.empty.hidden = false;
    elements.guesses.append(elements.empty);
  } else {
    elements.empty.hidden = true;
    guesses.forEach((breedIndex, position) => {
      elements.guesses.append(renderGuess(breedIndex, position));
    });
  }
  updateAttempts();

  const solved = guesses.at(-1) === targetIndex;
  completed = solved || guesses.length >= MAX_GUESSES;
  const target = breeds[targetIndex];
  elements.input.disabled = completed;
  elements.submit.disabled = completed || !Number.isInteger(Number(elements.input.dataset.selectedIndex));
  elements.shareButton.hidden = !completed;
  elements.resultEyebrow.hidden = !completed;
  elements.resultTitle.hidden = !completed;
  elements.resultDetail.hidden = !completed;
  loadTargetImage(target, targetIndex);

  if (completed) {
    elements.resultEyebrow.textContent = solved ? "Rätsel gelöst" : "Tagesrätsel beendet";
    elements.resultTitle.textContent = target.name;
    const labels = classificationLabels(target);
    const fciText = labels
      ? `Gruppe ${target.gruppe} ${labels.group} · Sektion ${target.sektion} ${labels.section}`
      : "FCI-Gruppe/Sektion unbekannt";
    elements.resultDetail.textContent = `${target.herkunftsland ?? "Herkunft unbekannt"} · ${fciText}`;
    elements.live.textContent = solved
      ? `Richtig. ${target.name} in ${guesses.length} Versuchen gefunden.`
      : `Keine Versuche mehr. Gesucht war ${target.name}.`;
  }
}

function submitGuess() {
  if (completed) return;
  const breedIndex = Number(elements.input.dataset.selectedIndex);
  if (!Number.isInteger(breedIndex) || !breeds[breedIndex]) {
    elements.message.textContent = "Wähle zuerst eine Rasse aus den Vorschlägen.";
    elements.input.focus();
    return;
  }
  if (guesses.includes(breedIndex)) {
    elements.message.textContent = "Diese Rasse hast du heute schon geraten.";
    return;
  }

  guesses.push(breedIndex);
  elements.input.value = "";
  delete elements.input.dataset.selectedIndex;
  elements.message.textContent = "";
  elements.suggestions.hidden = true;
  elements.input.setAttribute("aria-expanded", "false");
  saveGuesses();
  renderGame();
  if (!completed) elements.input.focus();
}

function selectDailyBreed(date) {
  const { year, month, day, dayOfYear } = dateParts(date);
  currentDateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const order = shuffledForYear(year);
  targetIndex = order[(dayOfYear - 1) % order.length];
  elements.titleDate.textContent = new Intl.DateTimeFormat("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(date);
  guesses = readSavedGuesses(currentDateKey);
  renderGame();
}

function setupOriginMap(countryData) {
  continents = new Map(countryData.map(({ country, continent }) => [normalizeText(country), continent]));
}

function buildShareText() {
  const target = breeds[targetIndex];
  const emojiByStatus = { right: "🟩", near: "🟨", wrong: "🟥", unknown: "⬜" };
  const rows = guesses.map((breedIndex) => {
    const guess = breeds[breedIndex];
    const comparisons = [
      compareOrigin(guess, target),
      compareFci(guess, target),
      compareMeasurement(guess.groesse, target.groesse, "cm"),
      compareMeasurement(guess.gewicht, target.gewicht, "kg"),
    ];
    return comparisons.map(({ status }) => emojiByStatus[status]).join("");
  });
  const [year, month, day] = currentDateKey.split("-").map(Number);
  const date = new Intl.DateTimeFormat("de-DE", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(year, month - 1, day, 12));
  const score = guesses.at(-1) === targetIndex ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  return `${rows.join("\n")}\nBreedGuessle (${date}) ${score}\nhttps://le-shammer.github.io/breedguessle/`;
}

async function shareResult() {
  const message = buildShareText();
  try {
    if (navigator.share) await navigator.share({ title: "BreedGuessle", text: message });
    else if (navigator.clipboard) {
      await navigator.clipboard.writeText(message);
      elements.live.textContent = "Ergebnis kopiert.";
    } else {
      elements.live.textContent = "Teilen ist in diesem Browser nicht verfügbar.";
    }
  } catch {
    elements.live.textContent = "Teilen wurde abgebrochen.";
  }
}

function setupControls() {
  elements.resultImage.addEventListener("error", () => {
    elements.resultImageWrap.hidden = true;
  });

  elements.input.addEventListener("input", () => {
    delete elements.input.dataset.selectedIndex;
    elements.message.textContent = "";
    elements.submit.disabled = true;
    renderSuggestions();
  });

  elements.input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && !elements.suggestions.hidden) {
      event.preventDefault();
      setSelectedSuggestion(selectedIndex + 1);
    } else if (event.key === "ArrowUp" && !elements.suggestions.hidden) {
      event.preventDefault();
      setSelectedSuggestion(selectedIndex - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (!elements.suggestions.hidden && selectedIndex >= 0) selectSuggestion(selectedIndex);
      else submitGuess();
    } else if (event.key === "Escape") {
      elements.suggestions.hidden = true;
      elements.input.setAttribute("aria-expanded", "false");
    }
  });

  elements.submit.addEventListener("click", submitGuess);
  elements.shareButton.addEventListener("click", shareResult);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-box")) {
      elements.suggestions.hidden = true;
      elements.input.setAttribute("aria-expanded", "false");
    }
  });
}

async function start() {
  setupControls();
  try {
    const [breedResponse, continentResponse, classificationResponse] = await Promise.all([
      fetch(BREED_DATA_URL),
      fetch(CONTINENT_DATA_URL),
      fetch(FCI_CLASSIFICATION_URL),
    ]);
    if (!breedResponse.ok || !continentResponse.ok || !classificationResponse.ok) throw new Error("Lokale Datendateien konnten nicht geladen werden.");
    const [breedData, continentData, classificationData] = await Promise.all([
      breedResponse.json(),
      continentResponse.json(),
      classificationResponse.json(),
    ]);
    if (!Array.isArray(breedData) || !breedData.length || !Array.isArray(continentData) || !classificationData || typeof classificationData !== "object") {
      throw new Error("Das Datenformat ist ungültig.");
    }
    breeds = breedData;
    setupOriginMap(continentData);
    fciClassification = classificationData;
    selectDailyBreed(new Date());
  } catch (error) {
    elements.message.textContent = "Die Spieldaten konnten nicht geladen werden. Bitte die Seite über GitHub Pages oder einen lokalen Webserver öffnen.";
    elements.live.textContent = error.message;
    elements.input.disabled = true;
    elements.submit.disabled = true;
  }
}

start();