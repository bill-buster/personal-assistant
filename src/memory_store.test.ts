#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { readMemory, writeMemory } from './storage/memory_store';

const spikeDir = path.resolve(__dirname);
const memoryPath = path.join(spikeDir, 'memory.test.json');

function cleanup() {
  if (fs.existsSync(memoryPath)) {
    fs.unlinkSync(memoryPath);
  }
  const prefix = `${path.basename(memoryPath)}.corrupt.`;
  for (const entry of fs.readdirSync(spikeDir)) {
    if (entry.startsWith(prefix)) {
      fs.unlinkSync(path.join(spikeDir, entry));
    }
  }
  const tmpPath = `${memoryPath}.tmp`;
  if (fs.existsSync(tmpPath)) {
    fs.unlinkSync(tmpPath);
  }
}

let failures = 0;
cleanup();

// readMemory on missing file
const emptyMemory = readMemory(memoryPath);
if (!emptyMemory || emptyMemory.version !== 1 || emptyMemory.entries.length !== 0) {
  failures += 1;
  process.stderr.write('FAIL\ncase: read missing\nexpected: version 1, empty entries\n\n');
}

// writeMemory atomic behavior
writeMemory(memoryPath, { version: 1, entries: [{ ts: '2026-01-01T00:00:00Z', text: 'hi' }] });
if (!fs.existsSync(memoryPath)) {
  failures += 1;
  process.stderr.write('FAIL\ncase: write memory\nexpected: file exists\n\n');
}
if (fs.existsSync(`${memoryPath}.tmp`)) {
  failures += 1;
  process.stderr.write('FAIL\ncase: atomic write\nexpected: tmp removed\n\n');
}

const readBack = readMemory(memoryPath);
if (!readBack || readBack.entries.length !== 1 || readBack.entries[0].text !== 'hi') {
  failures += 1;
  process.stderr.write('FAIL\ncase: read back\nexpected: entry text\n\n');
}

// corruption recovery
fs.writeFileSync(memoryPath, '{not-json', 'utf8');
const recovered = readMemory(memoryPath);
const corruptPrefix = `${path.basename(memoryPath)}.corrupt.`;
const corruptFiles = fs.readdirSync(spikeDir).filter((entry) => entry.startsWith(corruptPrefix));
if (!recovered || recovered.entries.length !== 0) {
  failures += 1;
  process.stderr.write('FAIL\ncase: corrupt read\nexpected: empty entries\n\n');
}
if (corruptFiles.length !== 1) {
  failures += 1;
  process.stderr.write('FAIL\ncase: corrupt rename\nexpected: corrupt file created\n\n');
}

cleanup();

if (failures > 0) {
  process.exit(1);
}

process.stdout.write('OK\n');
export {};
