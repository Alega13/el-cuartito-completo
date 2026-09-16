/**
 * Normalizes genre and label values from the database to eliminate duplicates.
 * 
 * Handles:
 * - Case normalization: "house" / "HOUSE" → "House"
 * - Trailing/leading spaces: "Funk " → "Funk"
 * - Comma-separated duplicates: "Playhouse, Playhouse" → "Playhouse"
 * - Comma-separated multi-values: "Electronic, Deep House" → ["Deep House"]
 * - Typos & synonyms: "Tecno" → "Techno"
 */

// ── Genre alias map (lowercase key → canonical display name) ──
// Only add entries here for things that are genuinely the same genre
const GENRE_ALIASES = {
    'tecno': 'Techno',
    'house tribal': 'Tribal House',
    'detroit': 'Detroit Techno',
    'tech': 'Tech House',
    'funky': 'Funk',
    'funk house': 'Funky House',
    'ambient house': 'Ambient',
    'ambient trance': 'Trance',
    'electroclash': 'Electro',
    'italodance': 'Italo House',
    'house trance': 'Trance',
    'neo trance': 'Trance',
    'electro house': 'Electro',
    'dance-pop': 'Pop',
    'pop rap': 'Pop',
    'pop rock': 'Pop Rock',
    'funk / soul': 'Funk / Soul',
    'funk / soul, disco': 'Funk / Soul', // will also produce Disco
    'contemporary r&b': 'R&B',
    'swingbeat': 'R&B',
    'p.funk': 'Funk',
};

// Canonical capitalization map (lowercase → display)
const GENRE_DISPLAY = {
    'deep house': 'Deep House',
    'tech house': 'Tech House',
    'house': 'House',
    'techno': 'Techno',
    'minimal': 'Minimal',
    'electro': 'Electro',
    'disco': 'Disco',
    'acid': 'Acid',
    'acid house': 'Acid House',
    'acid jazz': 'Acid Jazz',
    'trance': 'Trance',
    'progressive house': 'Progressive House',
    'progressive trance': 'Progressive Trance',
    'jazz': 'Jazz',
    'jazz fusion': 'Jazz Fusion',
    'jazz-funk': 'Jazz-Funk',
    'funk': 'Funk',
    'funk / soul': 'Funk / Soul',
    'soul': 'Soul',
    'breakbeat': 'Breakbeat',
    'breaks': 'Breaks',
    'broken beat': 'Broken Beat',
    'downtempo': 'Downtempo',
    'dub': 'Dub',
    'dub techno': 'Dub Techno',
    'ambient': 'Ambient',
    'experimental': 'Experimental',
    'industrial': 'Industrial',
    'synth-pop': 'Synth-pop',
    'synthwave': 'Synthwave',
    'minimal techno': 'Minimal Techno',
    'deep techno': 'Deep Techno',
    'hard techno': 'Hard Techno',
    'hard house': 'Hard House',
    'hard groove': 'Hard Groove',
    'hard trance': 'Hard Trance',
    'uk garage': 'UK Garage',
    'garage house': 'Garage House',
    'speed garage': 'Speed Garage',
    'tribal house': 'Tribal House',
    'tribal': 'Tribal',
    'idm': 'IDM',
    'ebm': 'EBM',
    'drum n bass': 'Drum n Bass',
    'nu-disco': 'Nu-Disco',
    'hip hop': 'Hip Hop',
    'hip-house': 'Hip-House',
    'ghetto house': 'Ghetto House',
    'ghettotech': 'Ghettotech',
    'italo house': 'Italo House',
    'italo-disco': 'Italo-Disco',
    'euro house': 'Euro House',
    'french house': 'French House',
    'detroit techno': 'Detroit Techno',
    'microhouse': 'Microhouse',
    'leftfield': 'Leftfield',
    'glitch': 'Glitch',
    'new wave': 'New Wave',
    'abstract': 'Abstract',
    'bass music': 'Bass Music',
    'future jazz': 'Future Jazz',
    'balearic': 'Balearic',
    'r&b': 'R&B',
    'afrobeat': 'Afrobeat',
    'african': 'African',
    'latin': 'Latin',
    'reggae': 'Reggae',
    'dancehall': 'Dancehall',
    'dubstep': 'Dubstep',
    'jungle': 'Jungle',
    'dark ambient': 'Dark Ambient',
    'noise': 'Noise',
    'rock': 'Rock',
    'pop': 'Pop',
    'pop rock': 'Pop Rock',
    'boogie': 'Boogie',
    'big beat': 'Big Beat',
    'freestyle': 'Freestyle',
    'trip hop': 'Trip Hop',
    'footwork': 'Footwork',
    'funky house': 'Funky House',
    'ballad': 'Ballad',
    'drone': 'Drone',
    'neo soul': 'Neo Soul',
    'art rock': 'Art Rock',
    'indie rock': 'Indie Rock',
    'symphonic rock': 'Symphonic Rock',
    'modern classical': 'Modern Classical',
    'hardcore': 'Hardcore',
    'vocal': 'Vocal',
};

// Condition display mapping (short code → display name)
const CONDITION_DISPLAY = {
    'NM': 'Near Mint',
    'M': 'Mint',
    'VG+': 'VG+',
    'VG': 'VG',
    'G': 'Good',
};

/**
 * Normalizes a single genre string into one or more canonical genre names.
 * Splits comma-separated values and resolves aliases.
 */
export function normalizeGenre(raw) {
    if (!raw) return [];

    const trimmed = raw.trim();
    if (!trimmed) return [];

    // Split comma-separated values (e.g. "Electronic, Deep House, Minimal")
    const parts = trimmed.includes(',')
        ? trimmed.split(',').map(s => s.trim()).filter(Boolean)
        : [trimmed];

    const results = new Set();

    for (const part of parts) {
        const lower = part.toLowerCase();

        // Skip the generic "Electronic" when it appears alongside specific sub-genres
        if (lower === 'electronic' && parts.length > 1) continue;

        // Check alias map first
        if (GENRE_ALIASES[lower]) {
            results.add(GENRE_ALIASES[lower]);
            continue;
        }

        // Check display map for canonical capitalization
        if (GENRE_DISPLAY[lower]) {
            results.add(GENRE_DISPLAY[lower]);
            continue;
        }

        // Fallback: title-case the original
        results.add(part.charAt(0).toUpperCase() + part.slice(1));
    }

    return [...results];
}

/**
 * Normalizes a label string. Handles:
 * - Trimming whitespace
 * - Deduplicating comma-separated repeats ("Playhouse, Playhouse" → "Playhouse")
 * - Taking the first label when multiple different labels are comma-separated
 */
export function normalizeLabel(raw) {
    if (!raw) return null;

    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (trimmed.includes(',')) {
        // Split, trim, deduplicate
        const parts = [...new Set(trimmed.split(',').map(s => s.trim()).filter(Boolean))];
        // Return the first unique label
        return parts[0] || null;
    }

    return trimmed;
}

/**
 * Maps a condition code to its display name.
 */
export function normalizeCondition(raw) {
    if (!raw) return null;
    const trimmed = raw.trim();
    return CONDITION_DISPLAY[trimmed] || trimmed;
}

/**
 * Extracts and normalizes all genre values from a product into a deduplicated array.
 */
export function getProductGenres(product) {
    const rawGenres = [product.genre, product.genre2, product.genre3, product.genre4, product.genre5].filter(Boolean);
    const normalized = rawGenres.flatMap(g => normalizeGenre(g));
    return [...new Set(normalized)];
}
