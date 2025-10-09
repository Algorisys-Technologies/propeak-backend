// utils/crypto.server.js
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const MASTER_KEY = process.env.ENCRYPTION_KEY || "default_secret_key";

// Generate a company-specific encryption key
function getKey(companyId) {
  const key = `${MASTER_KEY}${companyId}`;
  return crypto.createHash("sha256").update(key).digest();
}

function encrypt(text, companyId) {
  if (!text) return "";
  const KEY = getKey(companyId);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(encrypted, companyId) {
  if (!encrypted) return "";
  const [ivHex, authTagHex, encryptedText] = encrypted.split(":");
  const KEY = getKey(companyId);

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = { encrypt, decrypt };
