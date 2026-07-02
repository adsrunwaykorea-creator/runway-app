import {
  PAYMENT_MIGRATION_019_FILE,
  PAYMENT_MIGRATION_INSTRUCTIONS,
  type PaymentSchemaStatus,
} from '@/lib/payment/payment-schema';

type Props = {
  schemaStatus: PaymentSchemaStatus | null;
};

export function AdminDbMigrationNotice({ schemaStatus }: Props) {
  if (!schemaStatus?.migrationRequired) return null;

  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
      <p className="text-base font-bold">결제 완료 기능을 사용하려면 Supabase DB 업데이트가 필요합니다</p>
      <p className="mt-2 leading-6">
        카카오페이 결제 승인 후 상담신청 상태 변경, 결제 완료 내역 저장, 이번 달 매출 집계가 모두 아래 SQL
        실행 후에 동작합니다.
      </p>

      {schemaStatus.missingItems.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {schemaStatus.missingItems.map((item) => (
            <li key={item}>
              <span className="font-semibold">누락:</span> {item}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 rounded-md border border-amber-200 bg-white p-4">
        <p className="font-semibold text-slate-900">실행할 SQL 파일</p>
        <code className="mt-1 block break-all rounded bg-zinc-100 px-2 py-1 text-xs text-slate-800">
          {PAYMENT_MIGRATION_019_FILE}
        </code>
        <ol className="mt-3 list-decimal space-y-1 pl-5 leading-6 text-slate-700">
          {PAYMENT_MIGRATION_INSTRUCTIONS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <p className="mt-3 text-xs text-amber-800">
        SQL 실행 전에는 결제 완료 내역·매출이 0으로 표시되고, 결제 완료 고객이 상담신청 목록에 남을 수
        있습니다.
      </p>
    </div>
  );
}
