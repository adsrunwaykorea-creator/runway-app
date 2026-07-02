'use client';

import { useEffect, useState } from 'react';
import { CHECKOUT_PRODUCT_NAME } from '@/lib/checkout/kakao-pay-product';
import { SUBSCRIBER_PAYMENT_CHANNELS } from '@/lib/subscriber/subscriber-constants';
import type { ConsultationLeadRow } from '@/types/consultation-lead';

export type SubscriberRegisterForm = {
  product_name: string;
  payment_method: string;
  payment_amount: string;
  paid_at: string;
  service_start_date: string;
  service_end_date: string;
  admin_memo: string;
};

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultEndDate(start: string): string {
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return todayInputValue();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

type Props = {
  lead: ConsultationLeadRow | null;
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (form: SubscriberRegisterForm) => Promise<boolean>;
};

export function SubscriberRegisterModal({ lead, open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<SubscriberRegisterForm>({
    product_name: CHECKOUT_PRODUCT_NAME,
    payment_method: 'bank_transfer',
    payment_amount: '499000',
    paid_at: todayInputValue(),
    service_start_date: todayInputValue(),
    service_end_date: defaultEndDate(todayInputValue()),
    admin_memo: '',
  });

  useEffect(() => {
    if (!open || !lead) return;
    const start = todayInputValue();
    setForm({
      product_name: lead.service_type?.trim() || CHECKOUT_PRODUCT_NAME,
      payment_method: 'bank_transfer',
      payment_amount: '499000',
      paid_at: start,
      service_start_date: start,
      service_end_date: defaultEndDate(start),
      admin_memo: lead.admin_memo ?? '',
    });
  }, [open, lead]);

  if (!open || !lead) return null;

  const leadName = lead.lead_name?.trim() || lead.phone?.trim() || '-';
  const company = lead.company_name?.trim() || lead.company?.trim() || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">가입자 등록</h3>
        <p className="mt-1 text-sm text-zinc-600">
          {leadName} · {company}
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await onSubmit(form);
            if (ok) onClose();
          }}
        >
          <label className="block text-sm">
            <span className="font-medium text-slate-800">상품명</span>
            <input
              required
              value={form.product_name}
              onChange={(e) => setForm((prev) => ({ ...prev, product_name: e.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">결제수단</span>
            <select
              value={form.payment_method}
              onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              {SUBSCRIBER_PAYMENT_CHANNELS.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">결제금액</span>
            <input
              required
              type="number"
              min={0}
              value={form.payment_amount}
              onChange={(e) => setForm((prev) => ({ ...prev, payment_amount: e.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">서비스 결제일</span>
            <input
              required
              type="date"
              value={form.paid_at}
              onChange={(e) => setForm((prev) => ({ ...prev, paid_at: e.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">서비스 시작일</span>
            <input
              required
              type="date"
              value={form.service_start_date}
              onChange={(e) => {
                const start = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  service_start_date: start,
                  service_end_date: defaultEndDate(start),
                }));
              }}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">서비스 종료일</span>
            <input
              required
              type="date"
              value={form.service_end_date}
              onChange={(e) => setForm((prev) => ({ ...prev, service_end_date: e.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-800">관리자 메모</span>
            <textarea
              value={form.admin_memo}
              onChange={(e) => setForm((prev) => ({ ...prev, admin_memo: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? '등록 중...' : '가입자 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
