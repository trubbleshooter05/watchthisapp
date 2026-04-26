/**
 * Validation + post-processing for recommendation blurbs (whyYoullLoveIt).
 * Used by fill-all-bundles, regenerate-recs, fix-template-blurbs.
 */

/** Mask abbreviations so sentence splitting does not false-split. */
function maskAbbreviations(s) {
  let t = String(s);
  t = t.replace(/\b(Mr|Mrs|Ms|Mx|Dr|Prof|Jr|Sr|St)\./gi, (m) => m.replace(/\./g, "․"));
  t = t.replace(/\b(e\.g\.|i\.e\.|vs\.|etc\.)\b/gi, (m) => m.replace(/\./g, "․"));
  return t;
}

function restoreAbbreviations(s) {
  return s.replace(/․/g, ".");
}

/**
 * Split into sentences on . ! ? followed by whitespace (next segment starts).
 */
export function splitIntoSentences(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return [];
  const masked = maskAbbreviations(raw);
  const parts = masked
    .split(/(?<=[.!?])\s+/)
    .map((x) => restoreAbbreviations(x).trim())
    .filter((x) => x.length > 0);
  return parts;
}

export function countWhySentences(text) {
  return splitIntoSentences(text).length;
}

const DANGLING_END = /\b(and|but|or|nor|with|for|to|from|in|on|at|by|as|if|because|though|although|while|where|when|that|which|who|the|a|an|its|their|your|our|my|his|her)\s*$/i;

function hasStitchedDuplicate(text) {
  const t = text.replace(/\s+/g, " ").trim();
  const n = t.length;
  if (n < 50) return false;
  for (let len = Math.min(80, Math.floor(n / 2)); len >= 35; len--) {
    const chunk = t.slice(0, len);
    if (t.indexOf(chunk, 1) !== -1) return true;
  }
  return false;
}

/**
 * Trim noise, fix obvious breaks, drop dangling tail clauses.
 */
export function postProcessWhyBlurb(text) {
  let s = String(text ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  s = s.replace(/\.{2,}/g, ".").replace(/\s+\./g, ".");

  // Drop a trailing clause that ends mid-thought (comma/colon/dash, no terminal stop)
  const terminal = /[.!?]$/;
  if (!terminal.test(s) && /[,:;—–-]\s*[^.!?]+$/.test(s)) {
    const cut = Math.max(s.lastIndexOf("."), s.lastIndexOf("!"), s.lastIndexOf("?"));
    if (cut > 40) s = s.slice(0, cut + 1).trim();
  }

  // Trim dangling conjunctions / articles at end (incomplete phrase)
  let parts = splitIntoSentences(s);
  parts = parts.map((p) => p.trim()).filter(Boolean);
  while (parts.length > 0) {
    const last = parts[parts.length - 1];
    const core = last.replace(/[.!?]+$/, "").trim();
    if (core.length < 25 || DANGLING_END.test(core)) {
      parts.pop();
      continue;
    }
    if (!/[.!?]$/.test(last)) {
      parts.pop();
      continue;
    }
    break;
  }
  s = parts.join(" ");

  // If still no terminal punctuation, trim back to last full stop
  if (s && !terminal.test(s)) {
    const cut = Math.max(s.lastIndexOf("."), s.lastIndexOf("!"), s.lastIndexOf("?"));
    if (cut > 30) s = s.slice(0, cut + 1).trim();
  }

  // Capitalize first letter
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }

  return s.trim();
}

const MIN_WORDS_PER_SENTENCE = 8;
const MAX_SENTENCES = 2;

/**
 * @returns {{ ok: boolean, reason?: string, text?: string }}
 */
export function validateWhyBlurb(rawText) {
  const processed = postProcessWhyBlurb(rawText);
  if (!processed) {
    return { ok: false, reason: "empty after post-processing" };
  }

  if (hasStitchedDuplicate(processed)) {
    return { ok: false, reason: "stitched or repeated text" };
  }

  const sentences = splitIntoSentences(processed);
  if (sentences.length < 1 || sentences.length > MAX_SENTENCES) {
    return {
      ok: false,
      reason: `need 1–${MAX_SENTENCES} sentences, found ${sentences.length}`,
    };
  }

  for (let i = 0; i < sentences.length; i++) {
    const sent = sentences[i].trim();
    if (!/[.!?]$/.test(sent)) {
      return { ok: false, reason: `sentence ${i + 1} lacks ending punctuation` };
    }
    const words = sent.replace(/[.!?]+$/, "").split(/\s+/).filter(Boolean);
    if (words.length < MIN_WORDS_PER_SENTENCE) {
      return { ok: false, reason: `sentence ${i + 1} is too short (fragment)` };
    }
    const core = sent.replace(/[.!?]+$/, "").trim();
    if (DANGLING_END.test(core)) {
      return { ok: false, reason: `sentence ${i + 1} ends with a dangling phrase` };
    }
  }

  return { ok: true, text: processed };
}

/**
 * Try builders in order until one validates; last resort: first post-processed only.
 * @param {Array<() => string>} builders
 */
export function pickValidBlurb(builders) {
  if (!builders.length) return "";
  for (const b of builders) {
    const raw = b();
    const v = validateWhyBlurb(raw);
    if (v.ok) return v.text;
  }
  const fallback = postProcessWhyBlurb(builders[builders.length - 1]());
  const v2 = validateWhyBlurb(fallback);
  return v2.ok ? v2.text : fallback;
}
