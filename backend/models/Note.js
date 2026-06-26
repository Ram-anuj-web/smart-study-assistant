const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
  heading: String,
  keyPoints: [String],
  definitions: { type: Map, of: String, default: {} },
  example: String,
}, { _id: false });

const noteSchema = new mongoose.Schema({
  userId:     { type: String, required: true, index: true },
  subject:    { type: String, required: true, index: true },
  topic:      { type: String, required: true },
  sourceType: { type: String, enum: ["topic", "pdf", "image"], default: "topic" },
  sections:   [sectionSchema],
  tldr:       String,
  tags:       [String],
}, { timestamps: true });

module.exports = mongoose.model("Note", noteSchema);
