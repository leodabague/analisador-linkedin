import { findCanonicalFromAliases } from './companyAliases';

// Company extraction patterns
export const COMPANY_EXTRACTION_PATTERNS = [
  /at\s+([^|,]+)/,
  /@\s*([^|,]+)/,
  /\|\s*([^|]+)$/,
  /em\s+([^|,]+)/,
  /na\s+([^|,]+)/
];

// Extract company name from job title
export const extractCompanyFromTitle = (title) => {
  if (!title) return '';
  
  const titleLower = String(title).toLowerCase();
  
  let company = '';
  for (const pattern of COMPANY_EXTRACTION_PATTERNS) {
    const match = titleLower.match(pattern);
    if (match) {
      company = match[1].trim();
      break;
    }
  }
  
  if (!company) return '';
  
  // Clean and normalize company name
  company = company
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  if (company.length <= 2) return '';
  
  // Check if company matches any known aliases
  const canonicalFromAlias = findCanonicalFromAliases(company, normalizeCompanyName);
  if (canonicalFromAlias) {
    return canonicalFromAlias;
  }
  
  return company;
};

export const normalizeCompanyName = (name) => {
  return name
    .toLowerCase()
    // Remove accents and diacritics
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Remove common legal suffixes
    .replace(/\b(ltda|ltd|inc|corp|corporation|sa|s\.a\.|llc|limited|group|grupo|brasil|brazil)\b/gi, '')
    // Remove common words that don't help identification
    .replace(/\b(the|a|an|e|da|do|de|das|dos)\b/gi, '')
    // Keep only letters, numbers, and spaces
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
};

export const getCompanyTokens = (name) => {
  return normalizeCompanyName(name)
    .split(' ')
    .filter(token => token.length > 1)
    .sort();
};

export const calculateSimilarity = (name1, name2) => {
  const tokens1 = getCompanyTokens(name1);
  const tokens2 = getCompanyTokens(name2);
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  // Check for exact match after normalization
  if (tokens1.join(' ') === tokens2.join(' ')) return 1.0;
  
  // Check if one is contained in the other (like "bcg" and "boston consulting group bcg")
  const str1 = tokens1.join(' ');
  const str2 = tokens2.join(' ');
  if (str1.includes(str2) || str2.includes(str1)) {
    const shorter = str1.length < str2.length ? str1 : str2;
    const longer = str1.length >= str2.length ? str1 : str2;
    return shorter.length / longer.length;
  }
  
  // Calculate Jaccard similarity (intersection over union)
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
};

const getTokensCached = (name, tokensCache) => {
  if (tokensCache.has(name)) return tokensCache.get(name);
  const t = getCompanyTokens(name);
  tokensCache.set(name, t);
  return t;
};

const getNormalizedString = (name, normalizedCache, tokensCache) => {
  if (normalizedCache.has(name)) return normalizedCache.get(name);
  const s = getTokensCached(name, tokensCache).join(' ');
  normalizedCache.set(name, s);
  return s;
};

const jaccard = (aTokens, bTokens) => {
  const aSet = new Set(aTokens);
  let intersectionSize = 0;
  for (const tok of bTokens) {
    if (aSet.has(tok)) intersectionSize++;
  }
  const unionSize = aSet.size + bTokens.length - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
};

const isSimilar = (a, b, normalizedCache, tokensCache) => {
  const aStr = getNormalizedString(a, normalizedCache, tokensCache);
  const bStr = getNormalizedString(b, normalizedCache, tokensCache);
  if (aStr === bStr) return true;

  if (aStr.includes(bStr) || bStr.includes(aStr)) {
    const shorter = aStr.length < bStr.length ? aStr : bStr;
    const longer = aStr.length >= bStr.length ? aStr : bStr;
    return (shorter.length / longer.length) >= 0.6;
  }

  const aTokens = getTokensCached(a, tokensCache);
  const bTokens = getTokensCached(b, tokensCache);

  // Filtro barato: sem tokens em comum -> não similar
  const aSet = new Set(aTokens);
  let share = false;
  for (const t of bTokens) { if (aSet.has(t)) { share = true; break; } }
  if (!share) return false;

  const s = jaccard(aTokens, bTokens);
  return s > 0.6;
};

export const clusterCompanies = (companyExtraction) => {
  const { counts, companyNames } = companyExtraction;
  if (companyNames.length === 0) return { clustered: new Map(), canonicalByAlias: new Map() };

  const tokensCache = new Map();
  const normalizedCache = new Map();

  // Índice por token para reduzir as comparações
  const tokenIndex = new Map();
  for (const name of companyNames) {
    const tokens = getTokensCached(name, tokensCache);
    for (const tok of tokens) {
      if (!tokenIndex.has(tok)) tokenIndex.set(tok, new Set());
      tokenIndex.get(tok).add(name);
    }
  }

  const visited = new Set();
  const clustered = new Map();
  const canonicalByAlias = new Map();

  for (const seed of companyNames) {
    if (visited.has(seed)) continue;

    let canonical = seed;
    let canonicalCount = counts[seed] || 0;
    const clusterAliases = [];
    const queue = [seed];
    visited.add(seed);

    while (queue.length) {
      const cur = queue.pop();
      clusterAliases.push(cur);

      const curTokens = getTokensCached(cur, tokensCache);
      const candidateSet = new Set();
      for (const tok of curTokens) {
        const set = tokenIndex.get(tok);
        if (set) { for (const nm of set) candidateSet.add(nm); }
      }

      for (const cand of candidateSet) {
        if (visited.has(cand) || cand === cur) continue;
        if (!isSimilar(cur, cand, normalizedCache, tokensCache)) continue;
        visited.add(cand);
        queue.push(cand);
        const cCount = counts[cand] || 0;
        if (cCount > canonicalCount) {
          canonical = cand;
          canonicalCount = cCount;
        }
      }
    }

    const totalCount = clusterAliases.reduce((sum, nm) => sum + (counts[nm] || 0), 0);
    clustered.set(canonical, { count: totalCount, aliases: clusterAliases });
    for (const alias of clusterAliases) canonicalByAlias.set(alias, canonical);
  }

  return { clustered, canonicalByAlias };
};