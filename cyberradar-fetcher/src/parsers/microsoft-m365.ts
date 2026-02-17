// © 2025 CyberLage
/**
 * Microsoft 365 tenant feeds via Microsoft Graph (client credentials).
 *
 * Feeds:
 * - Message Center: /admin/serviceAnnouncement/messages
 * - Service Health: /admin/serviceAnnouncement/issues
 * - "Roadmap": derived from Message Center change items (planForChange / majorChange)
 *
 * Notes:
 * - These endpoints require Application permissions:
 *   - ServiceMessage.Read.All
 *   - ServiceHealth.Read.All
 * - If M365_* env vars are missing, fetchers return empty results (safe/no-op).
 */

import axios from 'axios';
import { subDays } from 'date-fns';
import { PartialAlert } from '../types/schema';
import { SourceFetchResult } from '../types/fetch-result';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

const TENANT_ID = process.env.M365_TENANT_ID || '';
const CLIENT_ID = process.env.M365_CLIENT_ID || '';
const CLIENT_SECRET = process.env.M365_CLIENT_SECRET || '';

let cachedToken: { token: string; expiresAtMs: number } | null = null;

function hasM365Config(): boolean {
  return Boolean(TENANT_ID && CLIENT_ID && CLIENT_SECRET);
}

async function getGraphToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - now > 60_000) {
    return cachedToken.token;
  }

  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await axios.post(tokenUrl, body.toString(), {
    timeout: 15000,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const token = response.data?.access_token;
  const expiresIn = Number(response.data?.expires_in || 3600);
  if (!token) {
    throw new Error(`Graph auth failed: ${JSON.stringify(response.data)}`);
  }

  cachedToken = { token, expiresAtMs: now + expiresIn * 1000 };
  return token;
}

async function graphGet(url: string, token: string): Promise<any> {
  const res = await axios.get(url, {
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'CyberRadar-Fetcher/1.0',
    },
  });
  return res.data;
}

async function fetchPaged(
  initialUrl: string,
  token: string,
  options: { maxPages: number; maxItems: number }
): Promise<{ items: any[]; pages: number }> {
  const items: any[] = [];
  let url: string | undefined = initialUrl;
  let pages = 0;

  while (url && pages < options.maxPages && items.length < options.maxItems) {
    const data: any = await graphGet(url, token);
    const batch = Array.isArray(data?.value) ? data.value : [];
    items.push(...batch);
    pages += 1;
    url = data?.['@odata.nextLink'];
  }

  return { items: items.slice(0, options.maxItems), pages };
}

function stripHtml(text: string): string {
  return String(text || '')
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

function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function mapMessageCenterSeverity(value: string | null | undefined): 'high' | 'medium' | 'info' {
  const v = (value || '').toLowerCase();
  if (v === 'critical') return 'high';
  if (v === 'high') return 'medium';
  return 'info';
}

function mapHealthSeverity(status: string | null | undefined): 'high' | 'medium' | 'info' {
  const s = (status || '').toLowerCase();
  if (s.includes('interruption') || s.includes('outage')) return 'high';
  if (s.includes('degradation') || s.includes('degraded')) return 'medium';
  return 'info';
}

/**
 * Message Center
 */
export async function fetchM365MessageCenter(): Promise<SourceFetchResult> {
  if (!hasM365Config()) {
    return { alerts: [], rawCache: [] };
  }

  const token = await getGraphToken();
  const cutoff = subDays(new Date(), 7);

  const url = `${GRAPH_BASE}/admin/serviceAnnouncement/messages?$top=100&$orderby=lastModifiedDateTime%20desc`;
  const { items, pages } = await fetchPaged(url, token, { maxPages: 5, maxItems: 250 });

  const recent = items.filter((p: any) => {
    const d = parseIso(p.lastModifiedDateTime) || parseIso(p.startDateTime) || new Date(0);
    return d >= cutoff;
  });

  const alerts: PartialAlert[] = recent.map((post: any) => {
    const id = String(post.id || '');
    const title = String(post.title || 'Microsoft 365 Message Center').trim();
    const body = stripHtml(post.body?.content || '');
    const category = String(post.category || '').trim();
    const severityRaw = String(post.severity || '').trim();
    const services = Array.isArray(post.services) ? post.services.map(String) : [];
    const tags = Array.isArray(post.tags) ? post.tags.map(String) : [];
    const actionRequiredBy = post.actionRequiredByDateTime ? String(post.actionRequiredByDateTime) : null;
    const isMajorChange = Boolean(post.isMajorChange);

    const publishedAtDate =
      parseIso(post.lastModifiedDateTime) || parseIso(post.startDateTime) || new Date();

    const descriptionParts = [
      `Category: ${category || 'n/a'}`,
      `Severity: ${severityRaw || 'n/a'}`,
      services.length ? `Services: ${services.join(', ')}` : null,
      tags.length ? `Tags: ${tags.join(', ')}` : null,
      actionRequiredBy ? `Action required by: ${actionRequiredBy}` : null,
      isMajorChange ? `Major change: YES` : null,
      body ? `\n${body}` : null,
    ].filter(Boolean);

    const description = descriptionParts.join('\n');

    return {
      sourceId: 'microsoft-message-center',
      sourceName: 'Microsoft 365 Message Center',
      sourceCategory: 'tenant',
      sourceTrustTier: 1,
      sourceUrl: `${GRAPH_BASE}/admin/serviceAnnouncement/messages/${encodeURIComponent(id)}`,
      sourceLanguage: 'en',

      publishedAt: publishedAtDate.toISOString(),

      title,
      titleDe: null,
      description: description.slice(0, 50000),
      descriptionDe: null,
      summary: null,
      summaryDe: null,

      alertType: 'm365-update',
      alertSubType: category || null,

      severity: mapMessageCenterSeverity(severityRaw),
      cvssScore: null,
      cvssVector: null,
      isActivelyExploited: false,
      isZeroDay: false,

      aiScore: null,
      aiScoreReasoning: null,

      cveIds: [],
      affectedVendors: ['Microsoft'],
      affectedProducts: services.length ? services : ['Microsoft 365'],
      affectedVersions: null,
      mitreTactics: [],
      iocs: [],

      csafDescription: null,
      csafRecommendations: null,
      articleText: null,

      compliance: {
        nis2: null,
        dora: null,
        gdpr: null,
        iso27001: null,
        aiAct: null,
        sectors: null,
      },

      isProcessed: false,
      processingState: 'raw',
      enrichmentVersion: undefined,

      rawBlobPath: null,
      rawContentType: 'api-response',

      // Optional M365 fields (stored in Cosmos even if not in the TS interface)
      m365MessageId: id,
      m365Category: category || null,
      m365Severity: severityRaw || null,
      m365Services: services,
      m365Tags: tags,
      m365ActionRequiredBy: actionRequiredBy,
      m365IsMajorChange: isMajorChange,
    } as any;
  });

  return {
    alerts,
    rawCache: [
      {
        label: `message-center-pages-${pages}`,
        url,
        contentType: 'application/json',
        extension: 'json',
        body: JSON.stringify({ fetchedAt: new Date().toISOString(), pages, items: recent }, null, 2),
      },
    ],
  };
}

/**
 * Service Health issues
 */
export async function fetchM365ServiceHealth(): Promise<SourceFetchResult> {
  if (!hasM365Config()) {
    return { alerts: [], rawCache: [] };
  }

  const token = await getGraphToken();
  const cutoff = subDays(new Date(), 2);

  const url = `${GRAPH_BASE}/admin/serviceAnnouncement/issues?$top=100&$orderby=lastModifiedDateTime%20desc`;
  const { items, pages } = await fetchPaged(url, token, { maxPages: 5, maxItems: 250 });

  const recent = items.filter((issue: any) => {
    const d = parseIso(issue.lastModifiedDateTime) || parseIso(issue.startDateTime) || new Date(0);
    return d >= cutoff;
  });

  const alerts: PartialAlert[] = recent.map((issue: any) => {
    const id = String(issue.id || '');
    const title = String(issue.title || 'Microsoft 365 Service Health').trim();
    const status = String(issue.status || issue.classification || '').trim();
    const service = String(issue.service || '').trim();
    const classification = String(issue.classification || '').trim();
    const impactDescription = stripHtml(issue.impactDescription || issue.impact || '');
    const details = stripHtml(issue.details || issue.body?.content || '');
    const start = issue.startDateTime ? String(issue.startDateTime) : null;
    const end = issue.endDateTime ? String(issue.endDateTime) : null;
    const isResolved = String(status || '').toLowerCase().includes('restored') || String(status || '').toLowerCase().includes('resolved');

    const publishedAtDate =
      parseIso(issue.lastModifiedDateTime) || parseIso(issue.startDateTime) || new Date();

    const descriptionParts = [
      `Status: ${status || 'n/a'}`,
      service ? `Service: ${service}` : null,
      classification ? `Classification: ${classification}` : null,
      start ? `Start: ${start}` : null,
      end ? `End: ${end}` : null,
      impactDescription ? `Impact: ${impactDescription}` : null,
      details ? `\n${details}` : null,
    ].filter(Boolean);

    const description = descriptionParts.join('\n');

    return {
      sourceId: 'microsoft-service-health',
      sourceName: 'Microsoft 365 Service Health',
      sourceCategory: 'tenant',
      sourceTrustTier: 1,
      sourceUrl: `${GRAPH_BASE}/admin/serviceAnnouncement/issues/${encodeURIComponent(id)}`,
      sourceLanguage: 'en',

      publishedAt: publishedAtDate.toISOString(),

      title,
      titleDe: null,
      description: description.slice(0, 50000),
      descriptionDe: null,
      summary: null,
      summaryDe: null,

      alertType: 'm365-health',
      alertSubType: service || null,

      severity: mapHealthSeverity(status),
      cvssScore: null,
      cvssVector: null,
      isActivelyExploited: false,
      isZeroDay: false,

      aiScore: null,
      aiScoreReasoning: null,

      cveIds: [],
      affectedVendors: ['Microsoft'],
      affectedProducts: service ? [service] : ['Microsoft 365'],
      affectedVersions: null,
      mitreTactics: [],
      iocs: [],

      csafDescription: null,
      csafRecommendations: null,
      articleText: null,

      compliance: {
        nis2: null,
        dora: null,
        gdpr: null,
        iso27001: null,
        aiAct: null,
        sectors: null,
      },

      isProcessed: false,
      processingState: 'raw',
      enrichmentVersion: undefined,

      rawBlobPath: null,
      rawContentType: 'api-response',

      m365IssueId: id,
      m365Status: status || null,
      m365Service: service || null,
      m365IsResolved: isResolved,
    } as any;
  });

  return {
    alerts,
    rawCache: [
      {
        label: `service-health-pages-${pages}`,
        url,
        contentType: 'application/json',
        extension: 'json',
        body: JSON.stringify({ fetchedAt: new Date().toISOString(), pages, items: recent }, null, 2),
      },
    ],
  };
}

/**
 * "Roadmap" feed: derived from Message Center change items.
 * We treat planForChange/major-change items as roadmap signals.
 */
export async function fetchM365Roadmap(): Promise<SourceFetchResult> {
  if (!hasM365Config()) {
    return { alerts: [], rawCache: [] };
  }

  const token = await getGraphToken();
  const cutoff = subDays(new Date(), 30);

  const url = `${GRAPH_BASE}/admin/serviceAnnouncement/messages?$top=100&$orderby=lastModifiedDateTime%20desc`;
  const { items, pages } = await fetchPaged(url, token, { maxPages: 8, maxItems: 500 });

  const recent = items
    .filter((p: any) => {
      const d = parseIso(p.lastModifiedDateTime) || parseIso(p.startDateTime) || new Date(0);
      return d >= cutoff;
    })
    .filter((p: any) => {
      const cat = String(p.category || '').toLowerCase();
      return cat === 'planforchange' || Boolean(p.isMajorChange);
    });

  const alerts: PartialAlert[] = recent.map((post: any) => {
    const id = String(post.id || '');
    const title = String(post.title || 'Microsoft 365 Roadmap').trim();
    const body = stripHtml(post.body?.content || '');
    const category = String(post.category || '').trim();
    const services = Array.isArray(post.services) ? post.services.map(String) : [];
    const actionRequiredBy = post.actionRequiredByDateTime ? String(post.actionRequiredByDateTime) : null;
    const isMajorChange = Boolean(post.isMajorChange);

    const publishedAtDate =
      parseIso(post.lastModifiedDateTime) || parseIso(post.startDateTime) || new Date();

    const descriptionParts = [
      `Category: ${category || 'n/a'}`,
      services.length ? `Services: ${services.join(', ')}` : null,
      actionRequiredBy ? `Action required by: ${actionRequiredBy}` : null,
      isMajorChange ? `Major change: YES` : null,
      body ? `\n${body}` : null,
    ].filter(Boolean);

    const description = descriptionParts.join('\n');

    return {
      sourceId: 'microsoft-roadmap',
      sourceName: 'Microsoft 365 Roadmap',
      sourceCategory: 'tenant',
      sourceTrustTier: 1,
      sourceUrl: `${GRAPH_BASE}/admin/serviceAnnouncement/messages/${encodeURIComponent(id)}`,
      sourceLanguage: 'en',

      publishedAt: publishedAtDate.toISOString(),

      title,
      titleDe: null,
      description: description.slice(0, 50000),
      descriptionDe: null,
      summary: null,
      summaryDe: null,

      alertType: 'm365-roadmap',
      alertSubType: category || null,

      severity: isMajorChange ? 'medium' : 'info',
      cvssScore: null,
      cvssVector: null,
      isActivelyExploited: false,
      isZeroDay: false,

      aiScore: null,
      aiScoreReasoning: null,

      cveIds: [],
      affectedVendors: ['Microsoft'],
      affectedProducts: services.length ? services : ['Microsoft 365'],
      affectedVersions: null,
      mitreTactics: [],
      iocs: [],

      csafDescription: null,
      csafRecommendations: null,
      articleText: null,

      compliance: {
        nis2: null,
        dora: null,
        gdpr: null,
        iso27001: null,
        aiAct: null,
        sectors: null,
      },

      isProcessed: false,
      processingState: 'raw',
      enrichmentVersion: undefined,

      rawBlobPath: null,
      rawContentType: 'api-response',

      m365MessageId: id,
      m365Category: category || null,
      m365ActionRequiredBy: actionRequiredBy,
      m365IsMajorChange: isMajorChange,
    } as any;
  });

  return {
    alerts,
    rawCache: [
      {
        label: `roadmap-derived-pages-${pages}`,
        url,
        contentType: 'application/json',
        extension: 'json',
        body: JSON.stringify({ fetchedAt: new Date().toISOString(), pages, items: recent }, null, 2),
      },
    ],
  };
}


