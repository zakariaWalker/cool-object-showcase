// ===== Knowledge Base Persistent Store =====
// IMPROVED: versioned migrations, merge strategy for importing,
//           structured error logging, fingerprint pruning.

import { KnowledgeBase, KBStats } from "./types";

const KB_STORAGE_KEY = "qed_knowledge_base";
const KB_VERSION = 3; // bump when schema changes

// ── Empty KB factory ─────────────────────────────────────────────────────────

function createEmptyKB(): KnowledgeBase {
  const now = new Date().toISOString();
  return {
    version: KB_VERSION,
    createdAt: now,
    updatedAt: now,
    stats: {
      totalExercisesAnalyzed: 0,
      totalPatterns: 0,
      totalEntities: 0,
      totalSchemas: 0,
      domainDistribution: {},
      subdomainDistribution: {},
      totalGaps: 0,
      lastAnalyzedAt: null,
    },
    patterns: [],
    entities: [],
    relations: [],
    schemas: [],
    exerciseFingerprints: [],
    learningGaps: [],
  };
}

// ── Migrations ────────────────────────────────────────────────────────────────

/**
 * Apply forward migrations when loading an older KB version.
 * Add a new case here whenever KB_VERSION is bumped.
 */
function migrate(kb: KnowledgeBase): KnowledgeBase {
  let current = { ...kb };

  // v1 → v2: ensure all patterns have the @d depth suffix in their signature
  if (!current.version || current.version < 2) {
    current.patterns = current.patterns.map((p) => ({
      ...p,
      signature: p.signature.includes("@d") ? p.signature : `${p.signature}@d0`,
    }));
    current.version = 2;
  }

  // v2 → v3: ensure all patterns have taskOutcomes and taskConfidence
  if (current.version < 3) {
    current.patterns = current.patterns.map((p) => ({
      ...p,
      taskOutcomes: p.taskOutcomes ?? {},
      taskConfidence: p.taskConfidence ?? {},
    }));
    current.version = 3;
  }
  
  if (current.version < 4) {
    current.learningGaps = current.learningGaps ?? [];
    current.version = 4;
  }

  return current;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function loadKB(): KnowledgeBase {
  try {
    const raw = localStorage.getItem(KB_STORAGE_KEY);
    if (!raw) return createEmptyKB();

    const kb = JSON.parse(raw) as KnowledgeBase;
    if (!kb.patterns || !kb.entities) return createEmptyKB();

    // Prune stale fingerprints (keep last 2000 to avoid unbounded growth)
    if (kb.exerciseFingerprints.length > 2000) {
      kb.exerciseFingerprints = kb.exerciseFingerprints.slice(-2000);
    }

    return migrate(kb);
  } catch (err) {
    console.warn("[KB] Failed to load knowledge base:", err);
    return createEmptyKB();
  }
}

export function saveKB(kb: KnowledgeBase): void {
  try {
    kb.updatedAt = new Date().toISOString();
    kb.version = KB_VERSION;
    kb.stats = computeStats(kb);
    localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(kb));
  } catch (err) {
    // localStorage quota exceeded or unavailable
    console.warn("[KB] Failed to save knowledge base:", err);
  }
}

export function resetKB(): KnowledgeBase {
  const kb = createEmptyKB();
  saveKB(kb);
  return kb;
}

// ── Export / Import ───────────────────────────────────────────────────────────

export function exportKB(kb: KnowledgeBase): string {
  return JSON.stringify({ ...kb, stats: computeStats(kb) }, null, 2);
}

/**
 * Import a KB from JSON.
 * Strategy: merge patterns/entities/schemas from the imported KB into
 * the current one rather than wholesale replace — preserves local learning.
 */
export function importKB(json: string, merge = false): KnowledgeBase {
  const incoming = JSON.parse(json) as KnowledgeBase;
  if (!incoming.patterns || !incoming.entities || !incoming.schemas) {
    throw new Error("Invalid knowledge base format: missing required fields");
  }

  const migrated = migrate(incoming);

  if (!merge) {
    saveKB(migrated);
    return migrated;
  }

  // Merge mode: combine with existing KB
  const existing = loadKB();
  const merged: KnowledgeBase = {
    ...existing,
    // Merge patterns by signature key
    patterns: mergeByKey(existing.patterns, migrated.patterns, (p) => p.signature),
    // Merge entities by name
    entities: mergeByKey(existing.entities, migrated.entities, (e) => e.name),
    // Merge relations by composite key
    relations: mergeByKey(
      existing.relations,
      migrated.relations,
      (r) => `${r.fromEntity}_${r.toEntity}_${r.type}`
    ),
    // Merge schemas by domain+subdomain+steps
    schemas: mergeByKey(
      existing.schemas,
      migrated.schemas,
      (s) => `${s.domain}/${s.subdomain}`
    ),
    // Union fingerprints
    exerciseFingerprints: [
      ...new Set([...existing.exerciseFingerprints, ...migrated.exerciseFingerprints]),
    ],
  };

  saveKB(merged);
  return merged;
}

function mergeByKey<T>(existing: T[], incoming: T[], key: (item: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of existing) map.set(key(item), item);
  for (const item of incoming) {
    const k = key(item);
    if (!map.has(k)) map.set(k, item);
    // If both exist, keep the one with higher frequency
    else {
      const ex = map.get(k) as any;
      const inc = item as any;
      if ("frequency" in ex && "frequency" in inc && inc.frequency > ex.frequency) {
        map.set(k, item);
      }
    }
  }
  return [...map.values()];
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function computeStats(kb: KnowledgeBase): KBStats {
  return {
    totalExercisesAnalyzed: kb.exerciseFingerprints.length,
    totalPatterns: kb.patterns.length,
    totalEntities: kb.entities.length,
    totalSchemas: kb.schemas.length,
    domainDistribution: kb.patterns.reduce((acc, p) => {
      p.domains.forEach((d) => { acc[d] = (acc[d] || 0) + 1; });
      return acc;
    }, {} as Record<string, number>),
    subdomainDistribution: kb.schemas.reduce((acc, s) => {
      acc[s.subdomain] = (acc[s.subdomain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    totalGaps: kb.learningGaps?.length || 0,
    lastAnalyzedAt: kb.stats.lastAnalyzedAt,
  };
}

// ── Fingerprint ───────────────────────────────────────────────────────────────

/** Stable hash for deduplication. Improved djb2 variant. */
export function hashExercise(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) ^ normalized.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  return (hash >>> 0).toString(36); // unsigned, base-36
}
