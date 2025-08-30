// utils/address.js
function normalizeAddress(addr = "") {
  if (!addr || typeof addr !== "string") return "";

  return addr
    .replace(/City:\s*\w+\,?/gi, "")
    .replace(/State:\s*\w+\,?/gi, "")
    .replace(/Pincode:\s*\d+\,?/gi, "")
    .replace(/Country:\s*IN\b/gi, "India")
    .replace(/\s+/g, " ")
    .replace(/,+/g, ",")
    .trim()
    .toLowerCase();
}

module.exports = { normalizeAddress };
