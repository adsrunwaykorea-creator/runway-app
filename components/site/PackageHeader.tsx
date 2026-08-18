import styles from "./PackageHeader.module.css";

type PackageHeaderProps = {
  active: "starter" | "growth";
};

export function PackageHeader({ active }: PackageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <a href="/package/starter" className={styles.logo}>
          RUNWAY
        </a>
        <nav className={styles.nav} aria-label="패키지 메뉴">
          <a
            href="/package/starter"
            className={
              active === "starter"
                ? `${styles.link} ${styles.active}`
                : styles.link
            }
          >
            초보 창업 패키지
          </a>
          <a
            href="/package/growth"
            className={
              active === "growth"
                ? `${styles.link} ${styles.active}`
                : styles.link
            }
          >
            사업 성장 패키지
          </a>
          <a href="#contact" className={styles.cta}>
            무료 상담 신청
          </a>
        </nav>
      </div>
    </header>
  );
}
