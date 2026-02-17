// © 2025 CyberLage
export interface Topic {
  id: string;
  label: string;
  labelEn: string;
  icon: string;
  keywords: string[];
}

export const TOPICS: Topic[] = [
  {
    id: "microsoft",
    label: "Microsoft & Cloud",
    labelEn: "Microsoft & Cloud",
    icon: "☁️",
    keywords: [
      "microsoft",
      "windows",
      "azure",
      "office",
      "edge",
      "exchange",
      "entra",
      "365",
      "teams",
      "copilot",
      "sharepoint",
      "outlook",
      "defender",
      "onedrive",
      "intune",
      "power platform",
      "dynamics",
      "m365",
      "message center",
      "service health",
      "roadmap",
    ],
  },
  {
    id: "linux",
    label: "Linux & Server",
    labelEn: "Linux & Server",
    icon: "🐧",
    keywords: [
      "linux",
      "kernel",
      "red hat",
      "rhel",
      "ubuntu",
      "suse",
      "debian",
      "fedora",
      "rocky",
      "centos",
      "amazon linux",
      "gentoo",
    ],
  },
  {
    id: "network",
    label: "Netzwerk & Firewall",
    labelEn: "Network & Firewall",
    icon: "🔒",
    keywords: [
      "cisco",
      "fortinet",
      "fortigate",
      "fortios",
      "palo alto",
      "juniper",
      "zyxel",
      "firewall",
      "router",
      "switch",
      "sophos",
      "checkpoint",
      "aruba",
    ],
  },
  {
    id: "ics",
    label: "ICS / OT",
    labelEn: "ICS / OT",
    icon: "🏭",
    keywords: [
      "siemens",
      "simatic",
      "sinec",
      "rockwell",
      "schneider",
      "abb",
      "ics",
      "scada",
      "plc",
      "industrial",
      "mitsubishi",
      "festo",
      "hmi",
      "dcs",
    ],
  },
  {
    id: "web",
    label: "Web & Applikation",
    labelEn: "Web & Application",
    icon: "🌐",
    keywords: [
      "chrome",
      "firefox",
      "safari",
      "browser",
      "wordpress",
      "drupal",
      "apache",
      "tomcat",
      "nginx",
      "php",
      "node",
      "react",
      "xss",
      "sql injection",
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise & Datenbank",
    labelEn: "Enterprise & Database",
    icon: "🗄️",
    keywords: [
      "sap",
      "oracle",
      "ibm",
      "db2",
      "mysql",
      "postgresql",
      "sql server",
      "mongodb",
      "redis",
      "elasticsearch",
      "qradar",
      "guardium",
      "cognos",
    ],
  },
  {
    id: "infra",
    label: "Virtualisierung & Infra",
    labelEn: "Virtualization & Infra",
    icon: "🖥️",
    keywords: [
      "vmware",
      "esxi",
      "vcenter",
      "docker",
      "kubernetes",
      "container",
      "citrix",
      "ivanti",
      "proxmox",
      "hyper-v",
      "nutanix",
      "terraform",
    ],
  },
  {
    id: "devops",
    label: "DevOps & CI/CD",
    labelEn: "DevOps & CI/CD",
    icon: "⚙️",
    keywords: [
      "gitlab",
      "jenkins",
      "github",
      "ci/cd",
      "devops",
      "npm",
      "pypi",
      "maven",
      "artifactory",
      "sonarqube",
      "ansible",
      "puppet",
    ],
  },
  {
    id: "identity",
    label: "Identity & Zugang",
    labelEn: "Identity & Access",
    icon: "🔑",
    keywords: [
      "phishing",
      "credential",
      "identity",
      "auth",
      "mfa",
      "sso",
      "password",
      "login",
      "oauth",
      "saml",
      "active directory",
      "ldap",
      "kerberos",
    ],
  },
  {
    id: "malware",
    label: "Malware & Ransomware",
    labelEn: "Malware & Ransomware",
    icon: "🦠",
    keywords: [
      "ransomware",
      "malware",
      "trojan",
      "botnet",
      "backdoor",
      "wiper",
      "rat",
      "infostealer",
      "cryptominer",
      "rootkit",
      "loader",
    ],
  },
  {
    id: "apt",
    label: "APT & Bedrohungsakteure",
    labelEn: "APT & Threat Actors",
    icon: "🎯",
    keywords: [
      "apt",
      "nation-state",
      "espionage",
      "campaign",
      "threat actor",
      "hacking group",
      "lazarus",
      "cozy bear",
      "fancy bear",
      "sandworm",
    ],
  },
  {
    id: "breach",
    label: "Datenleck & Breach",
    labelEn: "Data Leak & Breach",
    icon: "💧",
    keywords: [
      "breach",
      "data leak",
      "datenleck",
      "data exposure",
      "credential dump",
      "leaked",
    ],
  },
];

export function categorizeAlert(alert: {
  title: string;
  affectedProducts?: string[];
  affectedVendors?: string[];
  alertType?: string;
  sourceName?: string;
}): string[] {
  const searchText = [
    alert.title,
    ...(alert.affectedProducts || []),
    ...(alert.affectedVendors || []),
    alert.sourceName || "",
  ]
    .join(" ")
    .toLowerCase();

  const matched = TOPICS.filter(topic => topic.keywords.some(kw => searchText.includes(kw))).map(topic => topic.id);

  // M365 posts should always be treated as "Microsoft & Cloud"
  if (alert.alertType?.startsWith("m365-") && !matched.includes("microsoft")) {
    matched.push("microsoft");
  }

  if (alert.alertType === "breach" && !matched.includes("breach")) {
    matched.push("breach");
  }

  return matched.length > 0 ? matched : ["general"];
}


