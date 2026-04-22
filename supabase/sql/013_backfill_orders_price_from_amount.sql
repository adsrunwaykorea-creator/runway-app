-- orders.price NULL 보정
-- amount 값이 있는 기존 행은 price를 동일 금액으로 채웁니다.
UPDATE orders
SET price = amount
WHERE price IS NULL
  AND amount IS NOT NULL;

-- (선택) 여전히 price가 NULL인 건수 확인
-- SELECT COUNT(*) AS remaining_null_price
-- FROM orders
-- WHERE price IS NULL;
