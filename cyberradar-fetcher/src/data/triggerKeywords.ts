// © 2025 CyberLage
/**
 * Master list of allowed AI trigger keywords.
 * GPT-4o may ONLY use these triggers. Rule engine rejects anything else.
 */

export const ALLOWED_TRIGGERS = [
  // Vulnerability & Patch Management
  'vulnerability_management', 'risk_assessment', 'access_control', 'encryption',
  'supply_chain', 'patch_management', 'security_update', 'configuration_management',
  'critical_vulnerability', 'unpatched_system', 'cve',

  // Incident & Exploitation
  'active_exploitation', 'data_breach', 'service_disruption', 'ransomware_attack',
  'significant_incident', 'operational_impact', 'confirmed_compromise', 'incident_response',

  // Data Protection
  'personal_data_breach', 'pii_exposure', 'data_exfiltration', 'credential_theft',
  'patient_data', 'customer_data_leak', 'personal_data_processing',
  'encryption_weakness', 'access_control_bypass', 'authentication_bypass',
  'high_risk_data_breach', 'mass_pii_exposure', 'health_data_breach', 'financial_data_breach',

  // Financial Sector
  'financial_system_impact', 'financial_sector', 'ict_infrastructure',
  'third_party', 'cloud_provider', 'saas_vulnerability', 'managed_service',

  // Management & Governance
  'management_liability', 'board_responsibility', 'security_training',
  'entity_classification', 'sector_identification', 'registration_deadline',
  'risk_management', 'threat_assessment',

  // Threat Types
  'malware', 'ransomware', 'trojan', 'botnet', 'wiper',
  'network_vulnerability', 'firewall_bypass', 'vpn_vulnerability',
  'vendor_vulnerability', 'cloud_vulnerability', 'misconfiguration', 'default_credentials',
] as const;

export type TriggerKeyword = typeof ALLOWED_TRIGGERS[number];

/** Fast lookup set for validation */
export const ALLOWED_TRIGGERS_SET = new Set<string>(ALLOWED_TRIGGERS);


