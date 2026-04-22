# Solapi D-7 Rollout

## 점검 SQL
- `supabase/sql/010_solapi_d7_readiness_checks.sql`
  - `profiles.name`, `profiles.phone` 누락 여부 점검
  - `orders.user_id`, `orders.expires_at`, `orders.period` null/이상치 점검
  - 실제 D-7 발송 대상 미리보기
  - 발송 불가 대상과 사유 미리보기

## 운영 컬럼 마이그레이션
- `supabase/sql/011_alter_orders_add_notify_operations_columns.sql`
  - `payment_status`
  - `notify_7d_sent_at`
  - `notify_3d_sent_at`
  - `notify_1d_sent_at`
  - `last_notify_error`
  - `mypage_url`

## D-7 알림 데이터 매핑안
| 목적 | 소스 |
| --- | --- |
| 고객명 | `profiles.name` |
| 전화번호 | `profiles.phone` |
| 서비스명 | `orders.service` |
| 만료일시 | `orders.expires_at` |
| 이용 기간 | `orders.period` |
| 주문 상태 | `orders.status` |
| 결제 상태 | `orders.payment_status` |
| 중복 방지 | `orders.notify_7d` |
| 발송 성공 시각 | `orders.notify_7d_sent_at` |
| 발송 실패 사유 | `orders.last_notify_error` |
| CTA 링크 | `orders.mypage_url` |

## 템플릿 변수 예시
- `#{고객명}` -> `profiles.name`
- `#{서비스}` -> `orders.service`
- `#{만료일시}` -> `orders.expires_at`
- `#{마이페이지링크}` -> `orders.mypage_url`

## 테스트 고객 1명 기준 발송 준비 절차
1. `011_alter_orders_add_notify_operations_columns.sql` 적용
2. `010_solapi_d7_readiness_checks.sql` 실행
3. 테스트 대상 주문 1건 선택
4. 해당 주문의 `user_id`와 연결된 `profiles` row 확인
5. `profiles.name`, `profiles.phone` 값 채우기
6. 테스트 주문의 `expires_at`을 D-7 범위로 조정
   - 조건: `now() + 3 days < expires_at <= now() + 7 days`
7. `orders.notify_7d = false` 확인
8. `orders.payment_status = 'DONE'` 확인
9. `orders.mypage_url = '/mypage'` 또는 실제 운영 URL로 설정
10. Solapi 환경변수 확인
    - `SOLAPI_API_KEY`
    - `SOLAPI_API_SECRET`
    - `SOLAPI_FROM`
    - `SOLAPI_KAKAO_PF_ID`
11. D-7 템플릿 코드가 `lib/kakao/templateCodes.ts`에 연결되어 있는지 확인
12. 크론 엔드포인트 실행
    - `POST /api/cron/renew-notify`
13. 발송 성공 시 확인
    - `orders.notify_7d = true`
    - `orders.notify_7d_sent_at` 기록
    - Solapi 발송 내역 확인
14. 발송 실패 시 확인
    - `orders.last_notify_error` 기록
    - 누락값/템플릿/환경변수 재점검

## 추천 운영 순서
1. 먼저 테스트 고객 1건만 D-7 범위로 맞춤
2. 실제 발송 성공/플래그 갱신 확인
3. 그 다음 전체 대상 배치 실행
