import type {
  ManualItem,
  PresenceAudit,
  PresenceChannelAudit,
  PresenceChannelStatus,
  PromptResult,
  SocialLink,
  VisibilityScore,
} from "@aeo-pcs/shared";
import {
  collectOwnedDomains,
  collectMentionNames,
  isBrandMentioned,
  type VisibilityBusinessContext,
} from "../utils/visibilityAnalysis";
import { filterLocalBusinesses } from "@aeo-pcs/shared";

const URL_CHECK_TIMEOUT_MS = 8000;

const PLATFORM_DOMAINS = new Set([
  "google.com",
  "maps.google.com",
  "business.google.com",
  "g.page",
  "goo.gl",
  "openai.com",
  "chatgpt.com",
  "anthropic.com",
  "claude.ai",
  "perplexity.ai",
  "gemini.google.com",
  "wikipedia.org",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "bing.com",
  "yahoo.com",
]);

const GOOGLE_MAPS_HOSTS = new Set([
  "google.com",
  "maps.google.com",
  "business.google.com",
  "g.page",
  "goo.gl",
]);

function domainFromUrl(url: string): string | null {
  try {
    return new URL(url.trim()).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeDomain(domain: string): string {
  return domain.replace(/^www\./, "").toLowerCase();
}

function isGoogleMapsUrl(url: string): boolean {
  const host = domainFromUrl(url);
  if (!host) return false;
  return GOOGLE_MAPS_HOSTS.has(host) || host.endsWith(".google.com");
}

function domainMatchesOwned(domain: string, owned: string[]): boolean {
  const d = normalizeDomain(domain);
  return owned.some((o) => d === o || d.endsWith(`.${o}`) || o.endsWith(`.${d}`));
}

function isPlatformDomain(domain: string): boolean {
  const d = normalizeDomain(domain);
  if (PLATFORM_DOMAINS.has(d)) return true;
  return [...PLATFORM_DOMAINS].some((p) => d === p || d.endsWith(`.${p}`));
}

async function checkUrlReachable(url: string): Promise<boolean> {
  const trimmed = url.trim();
  if (!trimmed) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), URL_CHECK_TIMEOUT_MS);

  try {
    let res = await fetch(trimmed, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "MasterAEO-PresenceCheck/1.0" },
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(trimmed, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "MasterAEO-PresenceCheck/1.0" },
      });
    }
    return res.ok || (res.status >= 300 && res.status < 400);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function aggregateVisibilitySignals(input: {
  results: PromptResult[];
  bizCtx: VisibilityBusinessContext;
}) {
  let brandMentionedCount = 0;
  let sourceCitedCount = 0;
  let googleCitedCount = 0;
  let websiteCitedCount = 0;
  let totalChecks = 0;
  const domainCounts = new Map<string, number>();
  const competitorCounts = new Map<string, number>();
  const owned = collectOwnedDomains(input.bizCtx);
  const websiteDomain = input.bizCtx.websiteUrl
    ? domainFromUrl(input.bizCtx.websiteUrl)
    : null;

  for (const r of input.results) {
    for (const m of r.perModel) {
      if (!m.answer?.trim()) continue;
      totalChecks += 1;
      if (isBrandMentioned(m.answer, input.bizCtx) || m.mentioned) {
        brandMentionedCount += 1;
      }
      if (m.sourceMentioned) sourceCitedCount += 1;

      for (const s of m.sources) {
        const domain = normalizeDomain(s.domain || domainFromUrl(s.url) || "");
        if (!domain) continue;
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);

        if (GOOGLE_MAPS_HOSTS.has(domain) || domain.endsWith(".google.com")) {
          googleCitedCount += 1;
        }
        if (websiteDomain && domainMatchesOwned(domain, [websiteDomain])) {
          websiteCitedCount += 1;
        }
      }

      const citedDomains = m.sources
        .map((s) => (s.domain || "").trim())
        .filter(Boolean);
      const ownNames = collectMentionNames(input.bizCtx);
      for (const brand of filterLocalBusinesses(m.brandsMentioned || [], citedDomains, ownNames)) {
        competitorCounts.set(brand, (competitorCounts.get(brand) || 0) + 1);
      }
    }
  }

  const topCompetitors = [...competitorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);

  const citedDomains = [...domainCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([domain]) => domain);

  return {
    totalChecks,
    brandMentionedCount,
    sourceCitedCount,
    googleCitedCount,
    websiteCitedCount,
    domainCounts,
    topCompetitors,
    citedDomains,
    owned,
  };
}

function channelStatus(input: {
  provided: boolean;
  urlReachable?: boolean;
  citedInAi: boolean;
  brandMentioned: boolean;
}): PresenceChannelStatus {
  if (!input.provided) return "not_provided";
  if (input.urlReachable === false) return "needs_improvement";
  if (input.citedInAi && input.brandMentioned) return "verified";
  if (input.citedInAi || input.brandMentioned) return "needs_improvement";
  return "needs_improvement";
}

function buildGoogleSummary(input: {
  provided: boolean;
  url?: string;
  urlReachable?: boolean;
  citedInAi: boolean;
  brandMentioned: boolean;
}): string {
  if (!input.provided) {
    return "No Google Business Profile link is saved in your profile. AI assistants often rely on Google listings when recommending local businesses.";
  }
  if (input.urlReachable === false) {
    return "Your Google Business Profile link could not be reached. Confirm the URL in your profile points to your live listing.";
  }
  if (input.citedInAi && input.brandMentioned) {
    return "Your Google listing is on file and appears in recent AI answers and citations.";
  }
  if (input.citedInAi) {
    return "Your Google listing is cited by AI assistants, but your business name is still undermentioned in answers. Strengthen your profile description and reviews.";
  }
  if (input.brandMentioned) {
    return "AI assistants mention your business by name, but rarely cite your Google listing. Align your profile categories and description with how customers search.";
  }
  return "Your Google Business Profile is on file, but it is not yet influencing AI answers. Update categories, photos, services, and recent reviews to improve visibility.";
}

function buildWebsiteSummary(input: {
  provided: boolean;
  url?: string;
  urlReachable?: boolean;
  citedInAi: boolean;
  brandMentioned: boolean;
}): string {
  if (!input.provided) {
    return "No website is saved in your profile. A credible site helps AI assistants verify and cite your business.";
  }
  if (input.urlReachable === false) {
    return "Your website URL could not be reached. Fix hosting or SSL issues so AI crawlers and assistants can access your pages.";
  }
  if (input.citedInAi && input.brandMentioned) {
    return "Your website is on file and is being cited alongside brand mentions in AI answers.";
  }
  if (input.citedInAi) {
    return "Your website appears in AI citations. Expand service and location pages so assistants can quote you for more queries.";
  }
  if (input.brandMentioned) {
    return "AI assistants name your business but seldom cite your website. Add clear service pages, FAQs, and structured content assistants can reference.";
  }
  return "Your website is on file but is not yet cited in AI answers. Publish location-specific pages and FAQs that match how customers ask questions.";
}

function buildSocialSummary(input: {
  label: string;
  provided: boolean;
  urlReachable?: boolean;
  citedInAi: boolean;
}): string {
  if (!input.provided) return `${input.label} is not listed in your profile.`;
  if (input.urlReachable === false) {
    return `Your ${input.label} link could not be reached. Confirm the URL is correct and public.`;
  }
  if (input.citedInAi) {
    return `Your ${input.label} profile appears in AI citations. Keep the bio, location, and website link consistent with your other listings.`;
  }
  return `Your ${input.label} profile is on file but was not cited in this visibility run. Use consistent business details and link back to your website.`;
}

export async function buildPresenceAudit(input: {
  business: VisibilityBusinessContext;
  results: PromptResult[];
  score?: VisibilityScore | null;
  websiteUrl?: string;
  googleBusinessUrl?: string;
  socialLinks?: SocialLink[];
}): Promise<PresenceAudit> {
  const bizCtx: VisibilityBusinessContext = {
    name: input.business.name,
    nameAliases: input.business.nameAliases,
    websiteUrl: input.websiteUrl?.trim() || input.business.websiteUrl,
    googleBusinessUrl:
      input.googleBusinessUrl?.trim() || input.business.googleBusinessUrl,
  };

  const signals = aggregateVisibilitySignals({ results: input.results, bizCtx });
  const brandMentioned = signals.brandMentionedCount > 0;

  const websiteUrl = bizCtx.websiteUrl?.trim() || "";
  const googleUrl = bizCtx.googleBusinessUrl?.trim() || "";
  const websiteProvided = Boolean(websiteUrl);
  const googleProvided = Boolean(googleUrl);

  const [websiteReachable, googleReachable] = await Promise.all([
    websiteProvided ? checkUrlReachable(websiteUrl) : Promise.resolve(undefined),
    googleProvided ? checkUrlReachable(googleUrl) : Promise.resolve(undefined),
  ]);

  const googleBusiness: PresenceChannelAudit = {
    label: "Google Business Profile",
    url: googleUrl || undefined,
    providedByUser: googleProvided,
    urlReachable: googleProvided ? googleReachable : undefined,
    citedInAiAnswers: signals.googleCitedCount > 0,
    brandMentionedInAnswers: brandMentioned,
    status: googleProvided
      ? channelStatus({
          provided: true,
          urlReachable: googleReachable,
          citedInAi: signals.googleCitedCount > 0,
          brandMentioned,
        })
      : "missing",
    summary: buildGoogleSummary({
      provided: googleProvided,
      url: googleUrl,
      urlReachable: googleReachable,
      citedInAi: signals.googleCitedCount > 0,
      brandMentioned,
    }),
  };

  if (!googleProvided) {
    googleBusiness.status = "missing";
  }

  const website: PresenceChannelAudit = {
    label: "Website",
    url: websiteUrl || undefined,
    providedByUser: websiteProvided,
    urlReachable: websiteProvided ? websiteReachable : undefined,
    citedInAiAnswers: signals.websiteCitedCount > 0,
    brandMentionedInAnswers: brandMentioned,
    status: websiteProvided
      ? channelStatus({
          provided: true,
          urlReachable: websiteReachable,
          citedInAi: signals.websiteCitedCount > 0,
          brandMentioned,
        })
      : "missing",
    summary: buildWebsiteSummary({
      provided: websiteProvided,
      url: websiteUrl,
      urlReachable: websiteReachable,
      citedInAi: signals.websiteCitedCount > 0,
      brandMentioned,
    }),
  };

  if (!websiteProvided) {
    website.status = "missing";
  }

  const socialLinks = (input.socialLinks || []).filter((s) => s.url?.trim() && s.label?.trim());
  const social: PresenceChannelAudit[] = [];

  for (const link of socialLinks.slice(0, 8)) {
    const host = domainFromUrl(link.url);
    const reachable = await checkUrlReachable(link.url);
    const cited =
      host != null &&
      [...signals.domainCounts.keys()].some(
        (d) => d === host || d.endsWith(`.${host}`) || host.endsWith(`.${d}`)
      );

    social.push({
      label: link.label.trim(),
      url: link.url.trim(),
      providedByUser: true,
      urlReachable: reachable,
      citedInAiAnswers: cited,
      brandMentionedInAnswers: brandMentioned,
      status: channelStatus({
        provided: true,
        urlReachable: reachable,
        citedInAi: cited,
        brandMentioned,
      }),
      summary: buildSocialSummary({
        label: link.label.trim(),
        provided: true,
        urlReachable: reachable,
        citedInAi: cited,
      }),
    });
  }

  const directories = [...signals.domainCounts.entries()]
    .filter(([domain]) => !isPlatformDomain(domain) && !domainMatchesOwned(domain, signals.owned))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([domain, count]) => ({
      domain,
      citationCount: count,
      userLikelyListed: domainMatchesOwned(domain, signals.owned),
      summary: `Cited ${count} time${count === 1 ? "" : "s"} in AI answers. ${
        domainMatchesOwned(domain, signals.owned)
          ? "Your domain may already appear here."
          : "Competitors and directories on this site influence what AI recommends."
      }`,
    }));

  return {
    googleBusiness,
    website,
    social,
    directories,
    topCompetitors: signals.topCompetitors,
    citedDomains: signals.citedDomains,
  };
}

export function buildPresenceManualItems(
  audit: PresenceAudit,
  options?: { targetMarkets?: string },
): ManualItem[] {
  const items: ManualItem[] = [];
  const markets = options?.targetMarkets?.trim();
  const marketsPhrase = markets ? ` for ${markets}` : "";
  const marketsClause = markets
    ? ` Match posts and descriptions to these target markets: ${markets}.`
    : " Post updates that match your target locations.";
  const locationPagesPhrase = markets
    ? `dedicated pages for your main services and these markets (${markets})`
    : "dedicated pages for your main services and locations";

  if (audit.googleBusiness.status === "missing") {
    items.push({
      title: "Create Google Business Profile",
      guidance:
        `Register and verify a Google Business Profile${marketsPhrase}. Complete every core field—business name, address, hours, category, photos, and services—so AI assistants can treat your listing as a trusted local source.`,
    });
  } else if (
    audit.googleBusiness.providedByUser &&
    audit.googleBusiness.status === "needs_improvement"
  ) {
    items.push({
      title: "Strengthen Google listing",
      guidance:
        `Your Google Business Profile is on file but is underused in AI answers. Refresh your description with the services customers search for, add recent photos, respond to reviews.${marketsClause}`,
    });
  }

  if (audit.website.status === "missing") {
    items.push({
      title: "Publish a business website",
      guidance:
        `Add a public website with clear service pages, contact details, and location information${marketsPhrase}. AI assistants prefer citing stable business-owned pages when recommending providers.`,
    });
  } else if (
    audit.website.providedByUser &&
    audit.website.status === "needs_improvement"
  ) {
    items.push({
      title: "Improve website for AI",
      guidance:
        `Your website is live but rarely cited in AI answers. Add ${locationPagesPhrase}, publish an FAQ section, and keep titles and descriptions aligned with how customers ask questions.`,
    });
  }

  for (const profile of audit.social) {
    if (profile.status === "needs_improvement") {
      items.push({
        title: `Update ${profile.label} profile`,
        guidance: profile.summary,
      });
    }
  }

  if (!audit.social.length) {
    items.push({
      title: "Add social profiles",
      guidance:
        "List your active social profiles in your Master AEO business settings. Consistent names, locations, and website links across Instagram, Facebook, and LinkedIn help AI systems corroborate your identity.",
    });
  }

  for (const dir of audit.directories.slice(0, 3)) {
    if (!dir.userLikelyListed && dir.citationCount >= 2) {
      const label = dir.domain.replace(/^www\./, "");
      items.push({
        title: `Get listed on ${label}`,
        guidance: `AI assistants frequently cite ${label} when answering local queries in your category${marketsPhrase}. Create or claim a complete listing with photos, services, and a link to your website so you appear alongside competitors.`,
      });
    }
  }

  return items;
}

const GBP_CREATE_PATTERNS =
  /\b(claim|create|set up|register|add)\b.{0,40}\b(google business|google listing|google profile|gbp|google maps)\b/i;
const WEBSITE_CREATE_PATTERNS =
  /\b(create|build|launch|set up|make)\b.{0,30}\b(website|web site)\b/i;

export function filterConflictingManualItems(
  items: ManualItem[],
  audit: PresenceAudit
): ManualItem[] {
  return items.filter((item) => {
    const text = `${item.title} ${item.guidance}`;
    if (audit.googleBusiness.providedByUser && GBP_CREATE_PATTERNS.test(text)) {
      return false;
    }
    if (audit.website.providedByUser && WEBSITE_CREATE_PATTERNS.test(text)) {
      return false;
    }
    return true;
  });
}

export function isValidGoogleBusinessUrl(url: string): boolean {
  return isGoogleMapsUrl(url);
}
