import type { ConsultationLeadRow } from "@/types/consultation-lead";

const META_SOURCES = new Set(["meta", "facebook", "fb", "instagram", "ig"]);

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export function getLeadAcquisitionChannel(lead: ConsultationLeadRow): string {
  const source = firstNonEmpty(lead.last_utm_source, lead.utm_source, lead.first_utm_source).toLowerCase();
  const medium = firstNonEmpty(lead.last_utm_medium, lead.utm_medium, lead.first_utm_medium).toLowerCase();
  const fbclid = firstNonEmpty(lead.last_fbclid, lead.fbclid, lead.first_fbclid);

  if (META_SOURCES.has(source) || fbclid) {
    if (
      medium.includes("paid") ||
      medium === "cpc" ||
      medium === "cpm" ||
      medium === "cpa" ||
      medium === "ppc"
    ) {
      return "Meta 광고";
    }
    return source ? "Meta" : "Meta 광고";
  }

  if (source) return lead.last_utm_source?.trim() || lead.utm_source?.trim() || lead.first_utm_source?.trim() || source;
  return "";
}

export function getLeadCampaign(lead: ConsultationLeadRow): string {
  return firstNonEmpty(lead.last_utm_campaign, lead.utm_campaign, lead.first_utm_campaign);
}
