import { formatDateTime } from "@/lib/date";
import { getLeadAcquisitionChannel, getLeadCampaign } from "@/lib/meta/channel";
import type { ConsultationLeadRow } from "@/types/consultation-lead";

function dash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "-";
}

type Props = {
  lead: ConsultationLeadRow;
  compact?: boolean;
};

export function ConsultationLeadAttribution({ lead, compact = false }: Props) {
  const channel = getLeadAcquisitionChannel(lead) || "-";
  const campaign = getLeadCampaign(lead) || "-";
  const source = dash(lead.last_utm_source || lead.utm_source || lead.first_utm_source);
  const medium = dash(lead.last_utm_medium || lead.utm_medium || lead.first_utm_medium);
  const content = dash(lead.last_utm_content || lead.utm_content || lead.first_utm_content);
  const term = dash(lead.last_utm_term || lead.utm_term || lead.first_utm_term);
  const fbclid = dash(lead.last_fbclid || lead.fbclid || lead.first_fbclid);
  const landingPage = dash(lead.first_landing_page || lead.landing_page);
  const referrer = dash(lead.first_referrer || lead.referrer);
  const firstVisitedAt = formatDateTime(lead.first_visited_at);
  const lastSummary = [
    lead.last_utm_source,
    lead.last_utm_medium,
    lead.last_utm_campaign,
    lead.last_utm_content,
    lead.last_visited_at ? formatDateTime(lead.last_visited_at) : "",
  ]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-3">
      <p className="text-xs text-zinc-500">
        유입 채널 {channel} · 캠페인 {campaign}
      </p>
      {compact ? null : (
        <details className="mt-2 rounded-lg border border-zinc-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-700">유입정보 상세</summary>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-600 sm:grid-cols-2">
            <div>
              <dt className="font-semibold">유입 채널</dt>
              <dd className="break-all">{channel}</dd>
            </div>
            <div>
              <dt className="font-semibold">UTM source</dt>
              <dd className="break-all">{source}</dd>
            </div>
            <div>
              <dt className="font-semibold">UTM medium</dt>
              <dd className="break-all">{medium}</dd>
            </div>
            <div>
              <dt className="font-semibold">UTM campaign</dt>
              <dd className="break-all">{campaign}</dd>
            </div>
            <div>
              <dt className="font-semibold">UTM content</dt>
              <dd className="break-all">{content}</dd>
            </div>
            <div>
              <dt className="font-semibold">검색어 또는 UTM term</dt>
              <dd className="break-all">{term}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold">fbclid</dt>
              <dd className="break-all">{fbclid}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold">최초 랜딩페이지</dt>
              <dd className="break-all">{landingPage}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold">referrer</dt>
              <dd className="break-all">{referrer}</dd>
            </div>
            <div>
              <dt className="font-semibold">최초 방문일시</dt>
              <dd>{firstVisitedAt}</dd>
            </div>
            <div>
              <dt className="font-semibold">최근 유입정보</dt>
              <dd className="break-all">{lastSummary || "-"}</dd>
            </div>
          </dl>
        </details>
      )}
    </div>
  );
}
