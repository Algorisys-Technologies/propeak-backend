const DEFAULT_TASK_STAGES = ["todo", "inprogress", "completed"];

const VALID_FILE_EXTENSIONS = [
  "PDF",
  "DOCX",
  "PNG",
  "JPEG",
  "JPG",
  "TXT",
  "PPT",
  "XLSX",
  "XLS",
  "PPTX",
];

const MAGIC_SIGNATURES = {
  PDF: ["25504446"], // %PDF
  PNG: ["89504E47"], // .PNG
  JPEG: ["FFD8FF"], // JPEG/JPG
  JPG: ["FFD8FF"],
  TXT: [], // plain text, skip strict check
  DOCX: ["504B0304"], // ZIP-based OOXML
  XLSX: ["504B0304"],
  PPTX: ["504B0304"],
  XLS: [], // legacy binary, skip strict check
  PPT: [],
};

module.exports = {
  DEFAULT_TASK_STAGES,
  VALID_FILE_EXTENSIONS,
  MAGIC_SIGNATURES,
};
