"use client";

/**
 * Safely normalizes free-text topic entries to prevent near-duplicates.
 * Trims spaces, collapses multiple spaces, and applies Title Case to lowercase words
 * while intentionally preserving existing acronyms or specific casing.
 */
export const normalizeTopic = (topic: string | undefined | null): string => {
    if (!topic) return "";
    
    // Trim and collapse multiple spaces
    let clean = topic.trim().replace(/\s+/g, ' ');
    
    // Apply safe Title Case
    return clean.split(' ').map(word => {
        // Only capitalize if the user typed it all in lowercase
        // This prevents ruining things like "DBE Assessment" or "pH Levels"
        if (word.length > 0 && word === word.toLowerCase()) {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
    }).join(' ');
};