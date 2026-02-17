// © 2025 CyberLage
export type Locale = "en";

const EN_TRANSLATIONS: Record<string, string> = {
  // Navigation
  nav_dashboard: "Dashboard",
  nav_allAlerts: "All Alerts",
  nav_compliance: "Compliance",
  nav_meldepflicht: "Reporting",
  nav_evidence: "Evidence",
  nav_sources: "Sources",
  nav_aiAnalyst: "AI Analyst",
  nav_settings: "Settings",

  // Dashboard
  dashboard_title: "Dashboard",
  dashboard_subtitle: "Your daily cyber situational awareness",
  threat_level: "Threat level",
  alerts_today: "Alerts today",
  immediate_action: "Immediate action required",
  todays_alerts: "Today's alerts",
  sorted_by: "Sorted by",

  // Table headers
  col_score: "Score",
  col_severity: "Severity",
  col_title: "Title",
  col_topic: "Topic",
  col_date: "Date",
  col_source: "Source",

  // Severity labels
  sev_critical: "Critical",
  sev_critical_short: "CRIT",
  sev_high: "High",
  sev_high_short: "HIGH",
  sev_medium: "Medium",
  sev_medium_short: "MED",
  sev_low: "Low",
  sev_low_short: "LOW",
  sev_info: "Info",
  sev_info_short: "INFO",

  // Filters
  filter_severity: "Severity",
  filter_topic: "Topic",
  filter_source: "Source",
  filter_compliance: "Compliance",
  filter_type: "Type",
  filter_exploited: "Actively exploited only",
  filter_all: "All",

  // Time
  time_today: "Today",
  time_7days: "7 days",
  time_30days: "30 days",
  time_custom: "Custom range...",
  time_ago_hours: "{n}h ago",
  time_ago_days: "{n}d ago",

  // Topics
  topics_title: "Topics",
  topic_all: "All",

  // Compliance
  compliance_relevant: "Relevant",
  compliance_conditional: "Conditional",
  compliance_reporting: "Reportable",
  compliance_strip_title: "Compliance relevance",
  compliance_relevant_total: "relevant",
  compliance_reporting_required: "reportable",
  compliance_no_hits: "No matches",
  compliance_details: "Details",
  compliance_all_details: "All details",

  // Chat
  chat_title: "AI Analyst",
  chat_placeholder: "Ask a question...",
  chat_send: "Send",
  chat_scope_info: "Answers based only on your CyberLage data",
  chat_greeting: "Good morning",
  chat_intro: "I can provide summaries, prioritization, and compliance guidance based on captured alerts.",
  chat_data_only: "I answer only from your CyberLage data - no external sources.",
  chat_analyzing: "Analyzing alert data...",
  chat_error: "Error: response could not be generated. Please try again.",
  chat_clear: "Clear history",
  chat_footer: "Responses are based only on matching alert data.",
  chat_ask: "Ask me about your security alerts",
  chat_sources: "Sources",

  // Misc
  search_placeholder: "Search... (CVE, product, vendor)",
  show_all: "Show all",
  no_alerts: "No alerts in selected period",
  no_results: "No alerts found",
  external_link: "External",
  fallback_message: "Only {n} new alerts today - showing last 7 days.",
  fallback_override: "Today only",
  clear_filters: "Clear all",
  filter_label: "Filter",

  // Alert detail
  back_to_alerts: "Back to alerts",
  section_assessment: "Assessment",
  section_details: "Details",
  section_summary: "Summary",
  section_compliance: "Compliance assessment",
  section_topics: "Topics",
  label_reasoning: "Reasoning",
  label_affected_systems: "Affected systems",
  label_products: "Products",
  label_versions: "Versions",
  label_vendors: "Vendors",
  label_open_source: "Open source",
  label_exploited: "Actively exploited",
  label_zeroday: "Zero day",
  label_not_found: "Alert not found.",
  label_type: "Type",
  label_cve_ids: "CVE IDs",
  label_no_cve_ids: "No CVE IDs",
  score_method_title: "AI Score Method",
  score_method_subtitle: "How the AI score (0-100) is calculated.",
  score_method_link: "How is the AI score calculated?",

  // Loading
  loading_alert: "Loading alert...",
  loading_dashboard: "Loading dashboard...",
  loading_alerts: "Loading alerts...",
  loading_compliance: "Loading compliance...",
  loading_sources: "Loading sources...",

  // Alerts page
  page_all_alerts: "All alerts",
  page_all_alerts_subtitle: "Browse and filter captured security alerts",
  label_search: "Search",
  label_filters: "Filters",
  label_reset: "Reset",
  label_showing: "Showing",
  label_of: "of",
  label_results: "results",
  label_previous: "Previous",
  label_next: "Next",
  label_page: "Page",
  sev_all: "All severities",

  // Compliance page
  compliance_title: "Compliance overview",
  compliance_subtitle: "NIS2, DORA and GDPR relevance of your alerts",
  compliance_reporting_incidents: "Potentially reportable incidents",
  compliance_relevant_alerts: "Relevant alerts",
  compliance_reporting_hint: "⚠️ Reporting attention",
  compliance_relevant_hint: "Relevant + Conditional",
  compliance_empty_reporting: "No reportable alerts in selected period.",
  compliance_empty_relevant: "No relevant alerts in selected period.",

  // Sources page
  sources_title: "Data sources",
  sources_subtitle: "Active feeds and status",

  // Evidence
  evidence_title: "NIS2 Evidence Pack",
  evidence_subtitle: "Compliance metrics and audit evidence",

  // Pricing
  pricing_title: "Pricing",
  pricing_heading: "CyberLage Pricing",
  pricing_subtitle: "(Hidden in menu - PoC page)",
  pricing_recommended: "Recommended",
  pricing_plan_free: "Free",
  pricing_plan_team: "Team",
  pricing_plan_compliance: "Compliance",
  pricing_cta_register: "Register",
  pricing_cta_start_pilot: "Start pilot",
  pricing_cta_contact: "Contact us",
  pricing_feat_weekly_digest: "Weekly digest",
  pricing_feat_top5: "Top 5 alerts",
  pricing_feat_public_sources: "Public sources",
  pricing_feat_daily_briefing: "Daily briefing",
  pricing_feat_realtime_alerts: "Critical real-time alerts",
  pricing_feat_full_portal: "Full portal",
  pricing_feat_ai_analyst: "AI analyst",
  pricing_feat_topic_filters: "Topic filters",
  pricing_feat_action_items: "Action recommendations",
  pricing_feat_weekly_pdf: "Weekly management PDF",
  pricing_feat_audit_log: "Audit evidence log",
  pricing_feat_nis2_dora_export: "NIS2/DORA export",
  pricing_feat_compliance_dashboard: "Compliance dashboard",
  pricing_feat_mcp_integration: "MCP server integration",
  pricing_feat_api_access: "API access",
  pricing_all_plans: "All plans include AI analysis, public and enterprise feeds, and compliance mapping for NIS2, DORA, and GDPR.",

  // Settings
  settings_title: "Settings",
  settings_subtitle: "PoC - basic settings",
  settings_minimal: "This page is intentionally minimal in PoC. Planned options:",
  settings_opt_default_range: "Default date range (Today / 7 Days / 30 Days)",
  settings_opt_notifications: "Notifications (Email / Teams)",
  settings_opt_mcp: "MCP API key management",

  // Tenants
  tenants_title: "Tenants",
  tenants_subtitle: "Connect customer tenants and evaluate relevance/reporting per tenant",
  tenants_open: "Manage tenants",
  tenants_add: "Create tenant",
  tenants_new_subtitle: "Create company profile and choose data source",
  tenants_empty: "No tenants yet.",
  loading_tenants: "Loading tenants...",
  loading_tenant: "Loading tenant...",
  back_to_tenants: "Back to tenants",
  tenant_not_found: "Tenant not found.",
  tenant_edit_subtitle: "Configure profile, connection, and manual product list",
  tenant_step_profile: "Company profile",
  tenant_step_classification: "Classification (NIS2 / DORA / GDPR)",
  tenant_step_connection: "Data source / connection",
  tenant_name: "Name",
  tenant_name_placeholder: "e.g. City Utilities Munich",
  tenant_unnamed: "Unnamed tenant",
  tenant_sector: "Industry/sector",
  tenant_employees: "Employees",
  tenant_revenue: "Revenue (EUR)",
  tenant_bundesland: "State",
  tenant_dsgvo_authority: "Data protection authority",
  tenant_ms_tenant_id: "Microsoft tenant ID",
  tenant_conn_microsoft: "Connect Microsoft tenant",
  tenant_conn_microsoft_desc: "Admin consent (multi-tenant app) and sync via Graph/Defender APIs",
  tenant_conn_manual_products: "Manual product list",
  tenant_conn_manual_products_desc: "Fastest start: maintain product/vendor/version manually",
  tenant_conn_manual_app: "Customer app registration",
  tenant_conn_manual_app_desc: "Customer creates app registration and stores client ID/secret",
  tenant_status_connected: "Connected",
  tenant_status_pending: "Pending consent",
  tenant_status_error: "Error",
  tenant_status_disconnected: "Disconnected",
  tenant_classification: "Classification",
  tenant_last_sync: "Last sync",
  tenant_sync_assets: "Assets:",
  tenant_sync_incidents: "Incidents:",
  tenant_sync_matches: "Matches:",
  tenant_sync_status: "Sync status",
  tenant_sync_warnings: "Sync warnings",
  tenant_sync_attempted: "Attempted",
  tenant_sync_not_attempted: "Not attempted",
  tenant_sync_ok: "OK",
  tenant_sync_not_ok: "Not OK",
  tenant_sync_incidents_fetched: "Incidents fetched:",
  tenant_sync_software_fetched: "Software fetched:",
  tenant_sync_machines_fetched: "Devices fetched:",
  tenant_public_alerts_scanned: "Public alerts (match scan)",
  tenant_public_alerts_scanned_line: "{count} alerts scanned - {from} to {to}",
  tenant_select_label: "Select tenant",
  tenant_all_public: "All (public data)",
  tenant_test: "Test",
  tenant_sync_now: "Sync now",
  tenant_consent_success: "Microsoft admin consent granted successfully.",
  tenant_consent_hint: "For Microsoft connection, tenant ID must be set and admin consent granted.",
  tenant_start_consent: "Start admin consent",
  tenant_open_entra: "Open Entra",
  tenant_conn_manual_app_hint: "Values are stored encrypted. Paste secret only once.",
  tenant_manual_client_id: "Client ID",
  tenant_manual_client_secret: "Client secret",
  tenant_manual_products: "Manual product list",
  tenant_manual_products_hint: "Maintain vendor/product/version to match relevant public alerts.",
  tenant_vendor: "Vendor",
  tenant_product: "Product",
  tenant_version: "Version",
  tenant_device_count: "Device count",
  tenant_add_product: "Add product",
  tenant_manual_products_empty: "No products added yet.",
  tenant_incidents_title: "Incidents",
  tenant_incidents_hint: "Shows incidents from Microsoft Graph Security if connected.",
  tenant_open_incidents: "Open incidents",

  // Shared UI
  label_confidence: "Confidence",
  label_references: "References",
  compliance_not_relevant: "Not relevant",
  label_reporting_required: "Reporting",
  label_check_reporting: "Check reporting",
  label_deadline_hours: "Deadline (hours)",
  label_action_items: "Action items",
  label_menu_open: "Open menu",
  label_menu_close: "Close menu",
  label_active: "Active",
  label_time_range: "Time range",
  label_refresh: "Refresh",
  label_edit: "Edit",
  label_delete: "Delete",
  label_remove: "Remove",
  label_save: "Save",
  label_saving: "Saving...",
  label_create: "Create",
  label_cancel: "Cancel",
  urgent_empty: "No urgent alerts in current time range.",
  urgent_tag: "urgent",

  // Alert types
  type_vulnerability: "Vulnerability",
  type_exploit: "Exploit",
  type_breach: "Data breach",
  type_malware: "Malware",
  type_apt: "APT",
  type_advisory: "Security advisory",
  type_guidance: "Guidance",
  type_m365_update: "M365 update",
  type_m365_health: "M365 health",
  type_m365_roadmap: "M365 roadmap",

  // Generic nouns
  label_alerts: "alerts",
};

const translations: Record<Locale, Record<string, string>> = {
  en: EN_TRANSLATIONS,
};

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function t(key: string, locale: Locale = "en", params?: Record<string, string | number>): string {
  let text = translations[locale]?.[key] || humanizeKey(key);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}
