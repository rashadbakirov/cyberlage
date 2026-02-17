// © 2025 CyberLage
// Search
import {
  SearchClient,
  AzureKeyCredential,
} from "@azure/search-documents";
import type { Alert } from "@/types/alert";

export type SearchAlertDocument = Pick<Alert, "id" | "title"> & Partial<Alert>;

let searchClient: SearchClient<SearchAlertDocument> | null = null;

function resolveSearchConfig(): { endpoint: string; index: string; key: string } | null {
  const endpoint = (process.env.SEARCH_ENDPOINT || process.env.AZURE_SEARCH_ENDPOINT || "").trim();
  const index = (process.env.SEARCH_INDEX || process.env.AZURE_SEARCH_INDEX || "cyberradar-alerts-index").trim();
  const key = (process.env.SEARCH_API_KEY || process.env.AZURE_SEARCH_KEY || "").trim();
  if (!endpoint || !index || !key) return null;
  return { endpoint, index, key };
}

export function isSearchConfigured(): boolean {
  return Boolean(resolveSearchConfig());
}

function getSearchClient(): SearchClient<SearchAlertDocument> {
  const cfg = resolveSearchConfig();
  if (!cfg) {
    throw new Error(
      "Azure AI Search is not configured. Expected SEARCH_ENDPOINT/SEARCH_INDEX/SEARCH_API_KEY (or AZURE_SEARCH_* equivalents)."
    );
  }
  if (!searchClient) {
    searchClient = new SearchClient(
      cfg.endpoint,
      cfg.index,
      new AzureKeyCredential(cfg.key)
    );
  }
  return searchClient;
}

// Full-text search using Azure AI Search
export async function searchAlerts(
  query: string,
  options?: {
    top?: number;
    skip?: number;
    filter?: string;
    orderby?: string;
  }
): Promise<{ results: SearchAlertDocument[]; total: number }> {
  const client = getSearchClient();
  const top = options?.top || 20;
  const skip = options?.skip || 0;

  const searchResults = await client.search(query, {
    top,
    skip,
    includeTotalCount: true,
    filter: options?.filter,
    orderBy: options?.orderby ? [options.orderby] : undefined,
    queryType: "simple",
    searchMode: "any",
  });

  const results: SearchAlertDocument[] = [];
  for await (const result of searchResults.results) {
    results.push(result.document);
  }

  return {
    results,
    total: searchResults.count || results.length,
  };
}

// Semantic search for AI Chat (returns relevant context)
export async function semanticSearch(
  query: string,
  options?: {
    top?: number;
    filter?: string;
    searchMode?: "any" | "all";
    scoringProfile?: string;
  }
): Promise<SearchAlertDocument[]> {
  const client = getSearchClient();
  const top = options?.top ?? 5;

  const searchResults = await client.search(query, {
    top,
    includeTotalCount: false,
    queryType: "simple",
    searchMode: options?.searchMode ?? "any",
    filter: options?.filter,
    scoringProfile: options?.scoringProfile || undefined,
  });

  const results: SearchAlertDocument[] = [];
  for await (const result of searchResults.results) {
    results.push(result.document);
  }
  return results;
}


