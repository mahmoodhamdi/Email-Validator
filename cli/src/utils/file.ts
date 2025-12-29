/**
 * File handling utilities for CLI
 */

import fs from 'fs';
import path from 'path';

/**
 * Parse emails from file content
 * Supports plain text (one email per line) and CSV formats
 */
export function parseEmails(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const emails: string[] = [];

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Handle CSV (take first column that looks like email)
    const parts = line.split(/[,;\t]/);
    for (const part of parts) {
      const trimmed = part.trim().replace(/^["']|["']$/g, '');
      if (isEmailLike(trimmed)) {
        emails.push(trimmed);
        break;
      }
    }
  }

  // Deduplicate while preserving order
  return [...new Set(emails)];
}

/**
 * Check if a string looks like an email address
 */
function isEmailLike(str: string): boolean {
  return str.includes('@') && str.length >= 5 && str.length <= 254;
}

/**
 * Read file safely with error handling
 */
export function readFile(filePath: string): string {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const stats = fs.statSync(resolvedPath);
  if (stats.isDirectory()) {
    throw new Error(`Path is a directory, not a file: ${resolvedPath}`);
  }

  // Limit file size to 50MB
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is 50MB.`);
  }

  return fs.readFileSync(resolvedPath, 'utf-8');
}

/**
 * Write content to file
 */
export function writeFile(filePath: string, content: string): void {
  const resolvedPath = path.resolve(filePath);
  const dir = path.dirname(resolvedPath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(resolvedPath, content, 'utf-8');
}

/**
 * Get file extension
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().slice(1);
}

/**
 * Determine output format from file extension
 */
export function getFormatFromExtension(filePath: string): 'json' | 'csv' | null {
  const ext = getFileExtension(filePath);
  switch (ext) {
    case 'json':
      return 'json';
    case 'csv':
      return 'csv';
    default:
      return null;
  }
}
