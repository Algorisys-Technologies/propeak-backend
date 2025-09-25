require("dotenv").config();
const Groq = require("groq-sdk");
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

function extractJSON(str) {
  try {
    const cleaned = str.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON parse failed:", err, "Original:", str);
    return null;
  }
}

async function parseAddressWithGroq(rawAddress = "") {
  if (!rawAddress || typeof rawAddress !== "string") return null;

  const prompt = `
Extract the following fields from this address:
- street
- city
- state
- pincode
- country
Return ONLY valid JSON with keys:
{ "street", "city", "state", "pincode", "country", "normalized" }
"normalized" should be a single lowercase string suitable for DB comparison.

Address:
"""${rawAddress}"""
`;

  const completion = await client.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  return extractJSON(completion.choices[0].message.content);
}

module.exports = { parseAddressWithGroq };
