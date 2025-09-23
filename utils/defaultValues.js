const mongoose = require("mongoose");

const DEFAULT_QUERY = "";
const DEFAULT_PAGE = 0;
const DEFAULT_LIMIT = 5;
const NOW = new Date();

const toObjectId = (id) => {
  if (!id) return null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

module.exports = {
  DEFAULT_QUERY,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  NOW,
  toObjectId,
};
