// © 2025 CyberLage
import { PartialAlert } from './schema';

export interface RawCacheItem {
  label: string;
  url: string;
  contentType: string;
  extension: 'json' | 'xml' | 'html' | 'txt';
  body: string;
}

export interface SourceFetchResult {
  alerts: PartialAlert[];
  rawCache: RawCacheItem[];
}



