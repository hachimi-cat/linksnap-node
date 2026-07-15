export interface Link {
  id: string;
  slug: string;
  url: string;
  title?: string | null;
  description?: string | null;
  tags?: string[];
  expiresAt?: string | null;
  password?: boolean;
  workspaceId: string;
  domainId?: string | null;
  clicks?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QRCode {
  id: string;
  url: string;
  label?: string | null;
  imageUrl: string;
  scans?: number;
  createdAt: string;
}

export interface Tag {
  name: string;
  linkCount: number;
}

export interface Domain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed';
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  plan?: string;
  createdAt: string;
}

export interface BillingPlan {
  id: string;
  name: string;
  monthly: number;
  features: string[];
}

export interface BillingUsage {
  linksCreated: number;
  monthlyClickLimit: number;
  monthlyClicksUsed: number;
  asOf: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  /** Only returned on create. */
  secret?: string;
  createdAt: string;
}

export interface ClickStats {
  totalClicks: number;
  uniqueVisitors: number;
  byDay: Array<{ date: string; clicks: number }>;
  byCountry: Array<{ country: string; clicks: number }>;
  byReferer: Array<{ referer: string; clicks: number }>;
  byDevice: Array<{ device: string; clicks: number }>;
}
