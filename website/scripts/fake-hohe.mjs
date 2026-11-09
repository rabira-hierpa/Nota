#!/usr/bin/env node
// Stands in for Hohe's Python helper while the website's footage is recorded.
// It speaks the same line protocol, and each answer is the next sentence from
// $NOTA_CAPTURE_TRANSCRIPTS, so the words on screen are known in advance.
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const QUEUE = process.env.NOTA_CAPTURE_TRANSCRIPTS;
const REPLY_DELAY_MS = 350;

function nextTranscript() {
  const queue = JSON.parse(readFileSync(QUEUE, "utf8"));
  const text = queue.shift() ?? "";
  writeFileSync(QUEUE, JSON.stringify(queue));
  return text;
}

process.stdout.write(`${JSON.stringify({ ready: true, device: "mps" })}\n`);
createInterface({ input: process.stdin }).on("line", (line) => {
  const { id } = JSON.parse(line);
  const text = nextTranscript();
  setTimeout(() => process.stdout.write(`${JSON.stringify({ id, text })}\n`), REPLY_DELAY_MS);
});
