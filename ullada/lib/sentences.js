export function splitSentences(text) {
    return text
        .split(/(?<=[.!?…])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 2);
}
