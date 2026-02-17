// © 2025 CyberLage
/**
 * ISO 27001:2022 Annex A Control Mappings
 * Maps trigger keywords to relevant controls.
 */

export interface ISOControl {
  control: string;
  titleDe: string;
  titleEn: string;
  triggers: string[];
}

export const ISO_CONTROLS: Record<string, ISOControl> = {
  'A.5.19': {
    control: 'A.5.19',
    titleDe: 'Informationssicherheit in Lieferantenbeziehungen',
    titleEn: 'Information security in supplier relationships',
    triggers: ['supply_chain', 'third_party', 'vendor_vulnerability'],
  },
  'A.5.23': {
    control: 'A.5.23',
    titleDe: 'Informationssicherheit für Cloud-Dienste',
    titleEn: 'Information security for use of cloud services',
    triggers: ['cloud_vulnerability', 'saas_vulnerability', 'cloud_provider'],
  },
  'A.5.24': {
    control: 'A.5.24',
    titleDe: 'Planung der Vorfallsbehandlung',
    titleEn: 'Information security incident management planning',
    triggers: ['incident_response', 'significant_incident'],
  },
  'A.5.25': {
    control: 'A.5.25',
    titleDe: 'Bewertung von Sicherheitsereignissen',
    titleEn: 'Assessment and decision on information security events',
    triggers: ['threat_assessment', 'risk_assessment'],
  },
  'A.5.26': {
    control: 'A.5.26',
    titleDe: 'Reaktion auf Sicherheitsvorfälle',
    titleEn: 'Response to information security incidents',
    triggers: ['active_exploitation', 'confirmed_compromise', 'incident_response'],
  },
  'A.8.7': {
    control: 'A.8.7',
    titleDe: 'Schutz gegen Schadsoftware',
    titleEn: 'Protection against malware',
    triggers: ['malware', 'ransomware', 'trojan', 'botnet', 'wiper'],
  },
  'A.8.8': {
    control: 'A.8.8',
    titleDe: 'Handhabung technischer Schwachstellen',
    titleEn: 'Management of technical vulnerabilities',
    triggers: ['vulnerability_management', 'critical_vulnerability', 'patch_management', 'security_update', 'cve'],
  },
  'A.8.9': {
    control: 'A.8.9',
    titleDe: 'Konfigurationsmanagement',
    titleEn: 'Configuration management',
    triggers: ['configuration_management', 'misconfiguration', 'default_credentials'],
  },
  'A.8.20': {
    control: 'A.8.20',
    titleDe: 'Sicherheit von Netzwerken',
    titleEn: 'Networks security',
    triggers: ['network_vulnerability', 'firewall_bypass', 'vpn_vulnerability'],
  },
};


