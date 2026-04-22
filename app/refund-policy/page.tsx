import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "청약철회·환불정책 | 런웨이",
  description:
    "런웨이 서비스 신청 및 결제와 관련된 청약철회, 환불, 중도 해지 기준을 안내합니다.",
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
            런웨이 서비스 신청 및 결제와 관련된 청약철회, 환불, 중도 해지 기준을
            안내합니다.
          </p>
          <div>
            <a
              href="#inquiry-section"
              className="inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              문의하기
            </a>
          </div>
        </header>

        <article className="space-y-5">
          <section className={articleSectionClass}>
            <p className={bodyClass}>
              런웨이(이하 “회사”)는 고객이 온라인으로 신청하고 결제하는 광고 운영관리
              서비스에 대해 아래와 같은 청약철회 및 환불 기준을 운영합니다.
            </p>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제1조. 적용 대상</h2>
            <ol className={`${bodyClass} list-decimal space-y-2 pl-5`}>
              <li>
                본 정책은 런웨이 홈페이지 또는 런웨이가 제공한 온라인 결제 링크를 통해
                신청·결제된 서비스에 적용됩니다.
              </li>
              <li>
                런웨이의 결제 대상은 광고 플랫폼 집행비가 아닌 운영관리비 및 별도 안내된
                제작·세팅 비용입니다.
              </li>
              <li>
                네이버, 메타, 구글, 카카오 등 광고 플랫폼에 고객이 직접 결제한 광고비는
                회사가 수령하거나 보관하지 않으므로, 런웨이의 환불 대상에 포함되지
                않습니다. 해당 광고비의 취소·환불은 각 플랫폼의 정책에 따릅니다.
              </li>
            </ol>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제2조. 서비스 시작일의 기준</h2>
            <ol className={`${bodyClass} list-decimal space-y-2 pl-5`}>
              <li>
                서비스 시작일은 아래 각 호 중 먼저 도래하는 날로 합니다.
                <ul className="mt-2 space-y-2 pl-1">
                  <li>
                    가. 고객이 결제를 완료한 후, 광고 운영에 필요한 계정 권한·소재·사업자
                    정보 등 필수 자료 제공을 완료하고 회사가 업무 착수를 통지한 날
                  </li>
                  <li>
                    나. 고객이 카카오톡, 문자, 이메일 등으로 즉시 시작 의사를 표시하여
                    회사가 이에 따라 업무를 개시한 날
                  </li>
                </ul>
              </li>
              <li>
                전략 수립, 계정 점검, 광고계정 연동, 픽셀·태그 점검, 소재 검토, 캠페인 구조
                설계, 리포트 세팅 등은 서비스 착수 업무에 포함됩니다.
              </li>
            </ol>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제3조. 청약철회</h2>
            <ol className={`${bodyClass} list-decimal space-y-2 pl-5`}>
              <li>고객은 관련 법령에서 정한 범위 내에서 청약철회를 요청할 수 있습니다.</li>
              <li>
                고객이 계약내용 확인서 또는 결제 확인서를 받은 날부터 7일 이내이고, 아직
                서비스가 시작되지 않은 경우에는 결제한 운영관리비 전액 환불을 원칙으로
                합니다.
              </li>
              <li>
                다만 고객이 7일 이내라도 서비스의 즉시 시작을 요청하여 실제 업무가 개시된
                경우에는, 이미 제공된 서비스 범위에 따라 환불금액이 달라질 수 있습니다.
              </li>
              <li>
                관련 법령상 청약철회가 제한되거나 예외가 인정되는 경우에는 그 기준을 우선
                적용합니다.
              </li>
            </ol>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제4조. 환불 기준</h2>
            <div className={`${bodyClass} space-y-4`}>
              <div>
                <p className="font-semibold text-zinc-900">1. 서비스 시작 전 취소</p>
                <p>
                  고객이 서비스 시작 전에 취소를 요청한 경우, 결제한 운영관리비는 전액
                  환불합니다.
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-900">2. 서비스 시작 후 중도 해지</p>
                <p>
                  고객이 서비스 시작 후 해지를 요청한 경우, 환불금액은 아래 기준에 따라
                  산정합니다.
                </p>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>
                    총 결제금액에서 ① 서비스 시작일부터 해지 요청 접수일까지 진행된
                    운영관리비를 일할 계산한 금액과 ② 고객이 별도로 승인하거나 제공 완료된
                    제작비, 세팅비, 부가 작업비를 공제한 후 환불합니다.
                  </li>
                  <li>
                    이미 완료된 리포트 작성, 계정 세팅, 소재 기획, 픽셀·전환 설정, 랜딩 연동,
                    캠페인 구조 설계 등은 실제 제공된 서비스 범위로 봅니다.
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-zinc-900">3. 광고비 관련</p>
                <p>
                  광고 플랫폼에 고객이 직접 충전하거나 결제한 광고비는 런웨이의 수령 금액이
                  아니므로 런웨이가 환불하지 않습니다.
                </p>
              </div>
              <div>
                <p className="font-semibold text-zinc-900">4. 회사 귀책 사유</p>
                <p>
                  회사의 명백한 귀책사유로 정상적인 서비스 제공이 어려운 경우에는, 미제공
                  기간 또는 미이행 범위에 해당하는 금액을 협의 후 환불합니다.
                </p>
              </div>
            </div>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제5조. 환불 요청 방법</h2>
            <ol className={`${bodyClass} list-decimal space-y-2 pl-5`}>
              <li>
                환불 요청은 카카오톡 채널, 이메일, 또는 회사가 안내한 고객 응대 채널을 통해
                접수할 수 있습니다.
              </li>
              <li>
                고객은 본인 확인 및 결제 확인을 위해 성함, 연락처, 결제일, 결제수단, 신청
                서비스명을 함께 제출해야 합니다.
              </li>
              <li>
                회사는 접수 후 환불 가능 여부와 정산 내역을 고객에게 안내합니다.
              </li>
            </ol>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제6조. 환불 처리 기간</h2>
            <ol className={`${bodyClass} list-decimal space-y-2 pl-5`}>
              <li>
                관련 법령에 따라 환불이 이루어져야 하는 경우, 회사는 법정 기한 내 환불을
                처리합니다.
              </li>
              <li>
                회사는 특별한 사정이 없는 한 환불 확정일로부터 3영업일 이내 결제 취소 또는
                계좌 환불 절차를 진행합니다.
              </li>
              <li>
                카드사, PG사, 은행 등 결제수단별 처리 일정에 따라 실제 반영 시점은 다를 수
                있습니다.
              </li>
            </ol>
          </section>

          <section className={articleSectionClass}>
            <h2 className={headingClass}>제7조. 분쟁처리</h2>
            <ol className={`${bodyClass} list-decimal space-y-2 pl-5`}>
              <li>
                고객 불만, 이의제기, 정산 문의는 회사 고객응대 채널을 통해 접수할 수
                있습니다.
              </li>
              <li>
                본 정책에 정하지 않은 사항은 관련 법령 및 회사 이용약관에 따릅니다.
              </li>
              <li>
                본 정책보다 관련 법령이 고객에게 유리한 경우에는 관련 법령을 우선
                적용합니다.
              </li>
            </ol>
          </section>
        </article>

        <section
          id="inquiry-section"
          className="rounded-2xl border border-zinc-300 bg-zinc-900 p-6 text-zinc-100 md:p-8"
        >
          <h2 className="text-xl font-semibold md:text-2xl">부칙 및 문의 채널</h2>
          <dl className="mt-5 space-y-4 text-sm leading-7 md:text-base">
            <div>
              <dt className="font-semibold text-white">시행일</dt>
              <dd>2024.04.21</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">최종 수정일</dt>
              <dd>2024.04.21</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">문의 이메일</dt>
              <dd>
                <a
                  className="underline decoration-zinc-300 underline-offset-4 hover:text-white"
                  href="mailto:ads.runwaykorea@gmail.com"
                >
                  ads.runwaykorea@gmail.com
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">카카오톡 채널</dt>
              <dd>추후 안내 예정 (placeholder)</dd>
            </div>
          </dl>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-zinc-400 px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-zinc-900"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
