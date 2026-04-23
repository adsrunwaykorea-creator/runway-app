import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "청약철회·환불정책 | 런웨이",
  description:
    "런웨이 광고 운영 서비스의 청약철회, 중도해지, 환불 및 비용 공제 기준을 안내합니다.",
};

const articleSectionClass = "space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 md:p-8";
const headingClass = "text-xl font-semibold text-zinc-900 md:text-2xl";
const bodyClass = "text-sm leading-7 text-zinc-700 md:text-base";

export default function RefundPolicyPage() {
  return (
    <main className="flex-1 bg-zinc-50">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-12 md:px-8 md:py-16">
        <header className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 md:p-10">
          <p className="text-xs font-semibold tracking-[0.24em] text-zinc-500">REFUND POLICY</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 md:text-5xl">
            청약철회·환불정책
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-zinc-700 md:text-base">
            런웨이 서비스 신청 및 결제와 관련된 청약철회, 환불, 중도 해지 기준을 안내합니다.
          </p>
          <div
            className="max-w-3xl rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800 md:text-base"
            role="note"
          >
            서비스 시작 전에는 전액 환불이 가능하며, 서비스 시작 후 중도해지 시에는 운영관리비
            일할 계산금액, 총 결제금액의 10%, 별도 승인 또는 제공 완료된 작업비를 공제한 후
            환불합니다. 광고 플랫폼에 고객이 직접 결제한 광고비는 회사의 환불 대상에 포함되지
            않습니다.
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/payment"
              className="inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              결제 페이지로 이동
            </Link>
            <a
              href="#inquiry-section"
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
            >
              문의하기
            </a>
          </div>
        </header>

        <article className="space-y-6 md:space-y-7">
          <section className={articleSectionClass}>
            <h2 className={headingClass}>제1조. 목적</h2>
            <p className={bodyClass}>
              본 정책은 런웨이(이하 &quot;회사&quot;)가 제공하는 광고 운영 및 관련 부가 서비스의 온라인
              신청·결제와 관련하여, 고객의 청약철회, 중도해지, 환불 및 비용 공제 기준을 정함을
              목적으로 합니다.
            </p>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제2조. 적용 대상</h2>
            <ol className={`${bodyClass} list-decimal space-y-3 pl-5`}>
              <li>
                본 정책은 회사 홈페이지 또는 회사가 제공하는 온라인 결제 링크를 통하여 신청·결제된
                광고 운영관리 서비스에 적용됩니다.
              </li>
              <li>
                회사의 서비스 대금은 광고 플랫폼 집행비가 아닌 운영관리비 및 별도로 합의된
                제작·세팅·부가 작업비를 의미합니다.
              </li>
              <li>
                네이버, 메타, 구글, 카카오 등 광고 플랫폼에 고객이 직접 결제한 광고비는 회사가
                수령하거나 보관하지 않으므로, 회사의 환불 대상에 포함되지 않습니다.
              </li>
            </ol>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제3조. 서비스 시작일의 기준</h2>
            <ol className={`${bodyClass} list-decimal space-y-3 pl-5`}>
              <li>
                서비스 시작일은 다음 각 호 중 먼저 도래하는 날로 합니다.
                <ul className="mt-2 list-[lower-alpha] space-y-2 pl-5 marker:text-zinc-600">
                  <li>
                    고객이 결제를 완료한 후, 회사가 광고 운영에 필요한 계정 접근 권한, 사업자
                    정보, 소재 자료, 랜딩페이지 자료 등 필수 정보를 제공받아 업무 착수가 가능한
                    상태가 된 날
                  </li>
                  <li>
                    고객이 카카오톡, 문자, 이메일 기타 전자적 방법으로 서비스 시작 의사를 표시하여
                    회사가 이에 따라 업무를 개시한 날
                  </li>
                </ul>
              </li>
              <li>
                전략 수립, 계정 점검, 광고계정 생성 또는 점검, 픽셀·태그 설정, 소재 검토, 캠페인
                구조 설계, 리포트 세팅 등은 서비스 착수 업무에 포함됩니다.
              </li>
            </ol>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제4조. 청약철회</h2>
            <ol className={`${bodyClass} list-decimal space-y-3 pl-5`}>
              <li>
                고객은 계약체결일 또는 서비스 이용가능일로부터 7일 이내에 청약철회를 요청할 수
                있습니다.
              </li>
              <li>
                전항의 기간 내이고, 아직 서비스가 시작되지 않은 경우에는 회사는 고객에게 결제대금
                전액을 환불합니다.
              </li>
              <li>
                다만, 고객의 별도 승인에 따라 이미 제공이 완료된 제작물, 세팅 작업, 부가 작업이
                있는 경우, 회사는 해당 작업의 실제 제공 범위에 해당하는 금액을 공제한 후 환불할 수
                있습니다.
              </li>
              <li>
                청약철회는 고객이 회사에 전자우편, 고객센터, 카카오채널 또는 회사가 안내한 방법으로
                의사표시를 도달시킨 때 효력이 발생합니다.
              </li>
            </ol>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제5조. 서비스 시작 후 중도해지 및 환불</h2>
            <ol className={`${bodyClass} list-decimal space-y-3 pl-5`}>
              <li>
                서비스가 시작된 이후 고객의 사유로 계약을 중도해지하는 경우, 회사는 총 결제금액에서
                아래 각 호의 금액을 공제한 후 잔액을 환불합니다.
                <ul className="mt-2 list-[lower-alpha] space-y-2 pl-5 marker:text-zinc-600">
                  <li>서비스 시작일부터 해지 요청 접수일까지의 운영관리비를 일할 계산한 금액</li>
                  <li>총 결제금액의 10%에 해당하는 금액</li>
                  <li>고객이 별도로 승인하였거나 이미 제공 완료된 제작비, 세팅비, 부가 작업비</li>
                </ul>
              </li>
              <li>전항 제1호 나목의 10% 공제는 서비스 시작 이후의 중도해지에 한하여 적용합니다.</li>
              <li>
                제1항 제1호 다목의 비용은 사전에 고객과 합의되었거나, 실제 제공 완료 사실이
                확인되는 항목에 한하여 적용합니다.
              </li>
              <li>
                환불금이 없는 경우 회사는 환불하지 않을 수 있으며, 이미 제공된 서비스 또는 완료된
                작업 범위가 결제금액을 초과하는 경우 추가 청구는 별도 계약 또는 합의가 없는 한 하지
                않습니다.
              </li>
            </ol>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제6조. 광고비에 관한 특칙</h2>
            <ol className={`${bodyClass} list-decimal space-y-3 pl-5`}>
              <li>광고 플랫폼에 고객이 직접 결제한 광고비는 회사의 운영관리비와 별개입니다.</li>
              <li>
                광고비의 취소, 환불, 잔액, 정산 및 소멸 여부는 각 광고 플랫폼의 정책에 따르며,
                회사는 이에 대하여 책임을 부담하지 않습니다.
              </li>
              <li>
                회사는 고객 요청 시 광고비 집행 내역 확인에 필요한 범위에서 협조할 수 있습니다.
              </li>
            </ol>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제7조. 제작물 및 세팅 작업에 관한 기준</h2>
            <ol className={`${bodyClass} list-decimal space-y-3 pl-5`}>
              <li>
                제작물, 랜딩페이지 수정, 배너 제작, 광고 세팅, 픽셀 설치, 전환 이벤트 구성, CRM
                또는 폼 연동 등 별도 작업은 운영관리 서비스와 구분되는 독립 작업으로 볼 수 있습니다.
              </li>
              <li>
                전항의 작업이 별도 견적, 메시지 승인, 계약서, 결제내역, 작업 산출물 등으로 확인되는
                경우, 회사는 해당 비용을 환불 대상에서 제외하거나 공제할 수 있습니다.
              </li>
              <li>
                고객이 작업 진행을 승인한 이후 회사가 상당한 범위의 업무를 수행한 경우, 고객이
                중도해지를 요청하더라도 해당 작업비는 환불되지 않을 수 있습니다.
              </li>
            </ol>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제8조. 환불 절차 및 시기</h2>
            <ol className={`${bodyClass} list-decimal space-y-3 pl-5`}>
              <li>
                고객은 회사가 안내한 고객센터, 전자우편, 카카오채널 기타 회사가 정한 방법으로 환불
                또는 해지를 요청할 수 있습니다.
              </li>
              <li>
                회사는 환불 요청 접수 후 환불금 산정에 필요한 자료를 확인한 뒤, 특별한 사정이 없는
                한 7영업일 이내에 환불 여부 및 금액을 고객에게 안내합니다.
              </li>
              <li>
                실제 환불 반영 시점은 결제수단, PG사, 카드사 또는 금융기관의 처리 일정에 따라 달라질
                수 있습니다.
              </li>
            </ol>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제9조. 문의처</h2>
            <p className={`${bodyClass} mb-3`}>
              본 정책과 관련한 문의는 아래 채널을 통하여 접수할 수 있습니다.
            </p>
            <ul className={`${bodyClass} list-disc space-y-2 pl-5`}>
              <li>상호명: 런웨이</li>
              <li>
                이메일:{" "}
                <a
                  href="mailto:ads.runwaykorea@gmail.com"
                  className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
                >
                  ads.runwaykorea@gmail.com
                </a>
              </li>
              <li>고객 문의 채널: 회사 홈페이지 또는 카카오채널</li>
            </ul>
          </section>
        </article>

        <section
          id="inquiry-section"
          className="rounded-2xl border border-zinc-300 bg-zinc-900 p-6 text-zinc-100 md:p-8"
        >
          <h2 className="text-xl font-semibold md:text-2xl">요약 정보</h2>
          <dl className="mt-5 space-y-3 text-sm leading-6 md:text-base md:leading-7">
            <div>
              <dt className="font-semibold text-white">시행일</dt>
              <dd>2026.04.23</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">최종 수정일</dt>
              <dd>2026.04.23</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">상호명</dt>
              <dd>런웨이</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">대표자명</dt>
              <dd>박제혁</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">사업자등록번호</dt>
              <dd>326-02-03126</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">문의</dt>
              <dd className="space-y-1.5">
                <p>이메일: ads.runwaykorea@gmail.com</p>
                <p>홈페이지 문의 또는 회사가 안내하는 카카오채널을 이용해 주세요.</p>
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/payment"
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
            >
              결제 페이지로 이동
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-zinc-400 px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-zinc-900"
            >
              홈으로 이동
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
