#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data');
const feedPath = path.join(dataDir, 'linkedin-jobs.jsonl');
const pipelinePath = path.join(dataDir, 'pipeline.md');
const historyPath = path.join(dataDir, 'scan-history.tsv');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readText(file, fallback = '') {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : fallback;
}

function clean(value) {
  return String(value ?? '')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalizeUrl(raw) {
  const value = clean(raw);
  if (!value) return '';

  try {
    const url = new URL(value);
    const linkedinMatch = url.pathname.match(/^\/jobs\/view\/(\d+)/);
    if (url.hostname.endsWith('linkedin.com') && linkedinMatch) {
      return `https://www.linkedin.com/jobs/view/${linkedinMatch[1]}`;
    }
    url.hash = '';
    return url.toString();
  } catch {
    return value;
  }
}

function loadFeed(file) {
  if (!fs.existsSync(file)) {
    console.error(`LinkedIn monitor feed not found: ${path.relative(root, file)}`);
    console.error('Create data/linkedin-jobs.jsonl or let the LinkedIn monitor populate it first.');
    process.exit(1);
  }

  const records = [];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    try {
      records.push(JSON.parse(trimmed));
    } catch (error) {
      console.error(`Invalid JSONL at line ${index + 1}: ${error.message}`);
      process.exit(1);
    }
  });

  return records;
}

function extractPipelineUrls(markdown) {
  const urls = new Set();
  for (const match of markdown.matchAll(/(?:https?:\/\/[^\s|]+|local:[^\s|]+)/g)) {
    urls.add(canonicalizeUrl(match[0]));
  }
  return urls;
}

function parseHistory(tsv) {
  const urls = new Set();
  const lines = tsv.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('url\t')) continue;
    const [url] = line.split('\t');
    if (url) urls.add(canonicalizeUrl(url));
  }
  return urls;
}

function ensurePipeline(markdown) {
  if (markdown.trim()) return markdown;
  return '# Pipeline\n\n## Pendientes\n\n## Procesadas\n';
}

function appendPending(markdown, lines) {
  if (lines.length === 0) return markdown;

  const marker = '## Pendientes';
  const markerIndex = markdown.indexOf(marker);
  if (markerIndex === -1) {
    return `${markdown.trimEnd()}\n\n## Pendientes\n${lines.join('\n')}\n\n## Procesadas\n`;
  }

  const insertAt = markdown.indexOf('\n', markerIndex);
  const pos = insertAt === -1 ? markdown.length : insertAt + 1;
  return `${markdown.slice(0, pos)}${lines.join('\n')}\n${markdown.slice(pos)}`;
}

function dateFrom(record) {
  const candidate = record.found_at || record.first_seen || record.published_at;
  if (candidate) {
    const d = new Date(candidate);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

ensureDir(dataDir);

const feed = loadFeed(feedPath);
let pipeline = ensurePipeline(readText(pipelinePath));
let history = readText(historyPath, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n');
if (history && !history.endsWith('\n')) history += '\n';

const pipelineUrls = extractPipelineUrls(pipeline);
const historyUrls = parseHistory(history);
const pendingLines = [];
const historyLines = [];

let added = 0;
let duplicates = 0;
let invalid = 0;
let inactive = 0;

for (const record of feed) {
  const title = clean(record.title);
  const company = clean(record.company);
  const url = canonicalizeUrl(record.url);
  const source = clean(record.source || 'LinkedIn Monitor');

  if (!title || !company || !url) {
    invalid += 1;
    continue;
  }

  // Already processed by a previous import: do not create repeated history rows.
  if (historyUrls.has(url)) {
    duplicates += 1;
    continue;
  }

  if (record.active === false || record.status === 'expired') {
    historyLines.push(`${url}\t${dateFrom(record)}\t${source}\t${title}\t${company}\tskipped_expired`);
    historyUrls.add(url);
    inactive += 1;
    continue;
  }

  if (pipelineUrls.has(url)) {
    historyLines.push(`${url}\t${dateFrom(record)}\t${source}\t${title}\t${company}\tskipped_dup`);
    historyUrls.add(url);
    duplicates += 1;
    continue;
  }

  pendingLines.push(`- [ ] ${url} | ${company} | ${title}`);
  historyLines.push(`${url}\t${dateFrom(record)}\t${source}\t${title}\t${company}\tadded`);
  pipelineUrls.add(url);
  historyUrls.add(url);
  added += 1;
}

pipeline = appendPending(pipeline, pendingLines);
if (historyLines.length) history += `${historyLines.join('\n')}\n`;

fs.writeFileSync(pipelinePath, pipeline, 'utf8');
fs.writeFileSync(historyPath, history, 'utf8');

console.log('LinkedIn Monitor Import');
console.log('━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Feed records: ${feed.length}`);
console.log(`Added to pipeline: ${added}`);
console.log(`Duplicates: ${duplicates}`);
console.log(`Inactive/expired: ${inactive}`);
console.log(`Invalid records: ${invalid}`);
