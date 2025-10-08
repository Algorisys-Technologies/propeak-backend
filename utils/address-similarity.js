const levenshtein = require("fast-levenshtein");

function findSimilarProjectByAddress(
  projects,
  normalizedAddress,
  threshold = 0.7
) {
  if (!Array.isArray(projects) || !normalizedAddress) return null;

  for (const proj of projects) {
    const existingAddress = proj.customFieldValues?.get("address") || "";
    if (!existingAddress) continue;

    const distance = levenshtein.get(normalizedAddress, existingAddress);
    const maxLength = Math.max(
      normalizedAddress.length,
      existingAddress.length
    );
    const similarity = 1 - distance / maxLength;

    if (similarity >= threshold) {
      console.log(
        `Duplicate project detected: ${proj.title} (${Math.round(
          similarity * 100
        )}% match)`
      );
      return proj;
    }
  }
  return null;
}

module.exports = { findSimilarProjectByAddress };
