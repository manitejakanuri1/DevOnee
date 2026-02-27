/**
 * Safe path utilities for preventing path duplication bugs.
 *
 * All file paths in this app flow through multiple layers:
 *   GitHub Tree API → tree nodes → navigation URLs → [..path] catch-all → API calls → GitHub Contents API
 *
 * This module provides defensive normalization and deduplication at every boundary.
 */

/**
 * Normalize a file path: strip leading/trailing slashes, collapse double slashes,
 * remove '.' segments, and resolve '..' segments.
 */
export function normalizePath(rawPath: string): string {
    if (!rawPath) return '';

    let p = rawPath
        .replace(/\\/g, '/')     // backslash → forward slash
        .replace(/\/+/g, '/')    // collapse consecutive slashes
        .replace(/^\/+/, '')     // strip leading slashes
        .replace(/\/+$/, '');    // strip trailing slashes

    // Resolve . and .. segments
    const parts = p.split('/');
    const resolved: string[] = [];
    for (const seg of parts) {
        if (seg === '.' || seg === '') continue;
        if (seg === '..') {
            resolved.pop();
        } else {
            resolved.push(seg);
        }
    }

    return resolved.join('/');
}

/**
 * Detect if a path contains duplicated segments — e.g.
 * "assets/images/articles/2016/08/assets/images/articles/2016/08"
 *
 * Returns the deduplicated path if duplication is found, or null if clean.
 */
export function detectDuplication(filePath: string): string | null {
    if (!filePath) return null;

    const segments = filePath.split('/');
    const len = segments.length;

    // Try every possible prefix length from 2..len/2
    // A duplicated path will have its first half equal to the second half
    for (let prefixLen = 2; prefixLen <= Math.floor(len / 2); prefixLen++) {
        const prefix = segments.slice(0, prefixLen).join('/');
        const rest = segments.slice(prefixLen).join('/');

        // Check if the rest starts with the same prefix
        if (rest === prefix || rest.startsWith(prefix + '/')) {
            return prefix + (rest.length > prefix.length ? rest.slice(prefix.length) : '');
        }
    }

    return null;
}

/**
 * Normalize a path and remove any detected duplication.
 * Logs a warning to console in development when deduplication occurs.
 */
export function safePath(rawPath: string): string {
    const normalized = normalizePath(rawPath);
    if (!normalized) return '';

    const deduped = detectDuplication(normalized);
    if (deduped !== null) {
        console.warn(
            `[path-utils] Duplicated path detected and fixed:\n  Input:  "${normalized}"\n  Output: "${deduped}"`
        );
        return deduped;
    }

    return normalized;
}

/**
 * Safely join path segments, normalizing and deduplicating the result.
 * Handles cases where a segment already contains the full path.
 */
export function safePathJoin(...segments: string[]): string {
    const joined = segments
        .filter(Boolean)
        .map(s => s.replace(/^\/+|\/+$/g, ''))
        .filter(Boolean)
        .join('/');

    return safePath(joined);
}

/**
 * Build a safe blob viewer URL for navigating to a file.
 * Ensures the filePath is normalized and deduplicated before embedding in the URL.
 */
export function buildBlobUrl(owner: string, repo: string, filePath: string): string {
    const clean = safePath(filePath);
    if (!clean) return `/repo/${owner}/${repo}`;
    return `/repo/${owner}/${repo}/blob/${clean}`;
}

/**
 * Sanitize a path received from URL parameters (e.g., [...path] catch-all).
 * Joins the segments and applies full normalization + deduplication.
 */
export function safePathFromSegments(segments: string[]): string {
    if (!segments || segments.length === 0) return '';
    return safePath(segments.join('/'));
}
