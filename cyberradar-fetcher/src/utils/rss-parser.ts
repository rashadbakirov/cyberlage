// © 2025 CyberLage
/**
 * RSS/Atom Feed Parser Utility
 */

import Parser from 'rss-parser';
import axios from 'axios';

export interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  categories?: string[];
  isoDate?: string;
  description?: string;
}

export interface RSSFeed {
  title?: string;
  description?: string;
  link?: string;
  items: RSSItem[];
}

export interface ParsedRSSWithRaw {
  feed: RSSFeed;
  rawXml: string;
}

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['dc:date', 'dcDate'],
    ],
  },
  timeout: 30000,
});

export async function parseRSS(url: string): Promise<RSSFeed> {
  try {
    const { feed } = await parseRSSWithRaw(url);
    return feed;
  } catch (error) {
    throw new Error(`Failed to parse RSS feed ${url}: ${error}`);
  }
}

export async function parseRSSWithRaw(url: string): Promise<ParsedRSSWithRaw> {
  // Fetch the RSS feed
  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      'User-Agent': 'CyberRadar-Fetcher/1.0',
    },
  });

  const rawXml = typeof response.data === 'string' ? response.data : String(response.data);

  // Parse the XML
  const parsed = await parser.parseString(rawXml);

  const feed: RSSFeed = {
    title: parsed.title,
    description: parsed.description,
    link: parsed.link,
    items: parsed.items as RSSItem[],
  };

  return { feed, rawXml };
}

/**
 * Extract full text content from RSS item
 * Tries content:encoded first, then description, then contentSnippet
 */
export function extractContent(item: RSSItem): string {
  const contentEncoded = (item as any).contentEncoded;
  if (contentEncoded) return stripHtml(contentEncoded);
  if (item.content) return stripHtml(item.content);
  if (item.description) return stripHtml(item.description);
  if (item.contentSnippet) return item.contentSnippet;
  return '';
}

/**
 * Simple HTML tag stripper
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}


