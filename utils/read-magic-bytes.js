const fs = require("fs");

function readMagicBytes(filePath, length = 4) {
  const buffer = Buffer.alloc(length);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, buffer, 0, length, 0);
  fs.closeSync(fd);
  return buffer.toString("hex").toUpperCase();
}

module.exports = { readMagicBytes };
