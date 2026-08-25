/**
 * Runway marketing pages — contact / consultation lead submit (shared).
 */
(function () {
  const LEAD_API = "/api/consultation-lead";
  const DEFAULT_PAGE_SOURCE = "runwayads.kr";
  const MSG_LOADING = "상담 신청 중...";
  const MSG_SUCCESS = "상담 신청이 완료되었습니다. 빠르게 연락드리겠습니다.";
  const MSG_ERROR = "상담 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

  const ATTRIBUTION_STORAGE_KEY = "runway_meta_attribution_v1";
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];

  function detectPackageType(explicit) {
    if (explicit === "starter" || explicit === "growth") return explicit;
    const path = window.location.pathname || "";
    if (path.indexOf("/package/growth") !== -1) return "growth";
    if (path.indexOf("/package/starter") !== -1) return "starter";
    return "";
  }

  function emptyTouch() {
    return {
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_content: "",
      utm_term: "",
      fbclid: "",
      landing_page: "",
      referrer: "",
      visited_at: "",
    };
  }

  function hasAdParams(touch) {
    return Boolean(
      touch.utm_source ||
        touch.utm_medium ||
        touch.utm_campaign ||
        touch.utm_content ||
        touch.utm_term ||
        touch.fbclid,
    );
  }

  function isUnsetTouch(touch) {
    return !touch.visited_at && !touch.landing_page && !hasAdParams(touch) && !touch.referrer;
  }

  function sanitizeReferrer(referrer) {
    const value = (referrer || "").trim();
    if (!value) return "";
    try {
      const url = new URL(value);
      if (url.origin === window.location.origin) return "";
      return value;
    } catch {
      return value;
    }
  }

  function readTouchFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const read = (key) => params.get(key) || sessionStorage.getItem("runway_" + key) || "";
    return {
      utm_source: read("utm_source"),
      utm_medium: read("utm_medium"),
      utm_campaign: read("utm_campaign"),
      utm_content: read("utm_content"),
      utm_term: read("utm_term"),
      fbclid: read("fbclid"),
      landing_page: window.location.origin + window.location.pathname + window.location.search,
      referrer: sanitizeReferrer(document.referrer || ""),
      visited_at: new Date().toISOString(),
    };
  }

  function mergeNonEmpty(previous, next) {
    const merged = emptyTouch();
    Object.keys(merged).forEach((key) => {
      merged[key] = next[key] || previous[key] || "";
    });
    return merged;
  }

  function persistUtmFromUrl() {
    const params = new URLSearchParams(window.location.search);
    UTM_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) {
        sessionStorage.setItem("runway_" + key, value);
      }
    });
  }

  function persistAttributionFallback() {
    persistUtmFromUrl();
    const current = readTouchFromLocation();
    let stored = { first: emptyTouch(), last: emptyTouch() };
    try {
      const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {
      stored = { first: emptyTouch(), last: emptyTouch() };
    }
    stored.first = stored.first || emptyTouch();
    stored.last = stored.last || emptyTouch();

    if (isUnsetTouch(stored.first)) {
      stored.first = current;
      stored.last = hasAdParams(current) || !stored.last.visited_at ? current : stored.last;
    } else if (hasAdParams(current)) {
      stored.last = mergeNonEmpty(stored.last, current);
    }

    try {
      window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Ignore storage failures (private mode).
    }
    return stored;
  }

  function persistAttribution() {
    if (window.RunwayMeta && typeof window.RunwayMeta.captureAttribution === "function") {
      return window.RunwayMeta.captureAttribution();
    }
    return persistAttributionFallback();
  }

  function flattenAttribution(stored) {
    const first = (stored && stored.first) || emptyTouch();
    const last = (stored && stored.last) || emptyTouch();
    const pick = (key) => last[key] || first[key] || "";
    return {
      utm_source: pick("utm_source"),
      utm_medium: pick("utm_medium"),
      utm_campaign: pick("utm_campaign"),
      utm_content: pick("utm_content"),
      utm_term: pick("utm_term"),
      fbclid: pick("fbclid"),
      landing_page: first.landing_page || last.landing_page || "",
      referrer: last.referrer || first.referrer || "",
      first_utm_source: first.utm_source || "",
      first_utm_medium: first.utm_medium || "",
      first_utm_campaign: first.utm_campaign || "",
      first_utm_content: first.utm_content || "",
      first_utm_term: first.utm_term || "",
      first_fbclid: first.fbclid || "",
      first_landing_page: first.landing_page || "",
      first_referrer: first.referrer || "",
      first_visited_at: first.visited_at || "",
      last_utm_source: last.utm_source || "",
      last_utm_medium: last.utm_medium || "",
      last_utm_campaign: last.utm_campaign || "",
      last_utm_content: last.utm_content || "",
      last_utm_term: last.utm_term || "",
      last_fbclid: last.fbclid || "",
      last_landing_page: last.landing_page || "",
      last_referrer: last.referrer || "",
      last_visited_at: last.visited_at || "",
    };
  }

  function getTrackingContext(pageSource) {
    const stored = persistAttribution();
    const fields = flattenAttribution(stored);
    const pathLabel = window.location.pathname === "/" ? "" : window.location.pathname;

    return {
      pageSource: window.location.href || `${pageSource || DEFAULT_PAGE_SOURCE}${pathLabel}`,
      referrer: fields.referrer || document.referrer || "",
      utm_source: fields.utm_source,
      utm_medium: fields.utm_medium,
      utm_campaign: fields.utm_campaign,
      utmSource: fields.utm_source,
      utmMedium: fields.utm_medium,
      utmCampaign: fields.utm_campaign,
      stored,
      fields,
    };
  }

  function applyAttribution(payload, tracking) {
    const fields = tracking.fields || {};
    payload.utmSource = fields.utm_source || tracking.utmSource || "";
    payload.utmMedium = fields.utm_medium || tracking.utmMedium || "";
    payload.utmCampaign = fields.utm_campaign || tracking.utmCampaign || "";
    payload.utmContent = fields.utm_content || "";
    payload.utmTerm = fields.utm_term || "";
    payload.fbclid = fields.fbclid || "";
    payload.landingPage = fields.landing_page || "";
    payload.landing_page = fields.landing_page || "";
    payload.referrer = tracking.referrer || fields.referrer || "";
    payload.attribution = tracking.stored || null;
    Object.keys(fields).forEach((key) => {
      if (fields[key]) payload[key] = fields[key];
    });
    payload.payload = {
      ...(payload.payload || {}),
      ...fields,
      referrer: payload.referrer,
      attribution: tracking.stored || null,
    };
    return payload;
  }

  function trackLeadOnce() {
    try {
      if (window.RunwayMeta && typeof window.RunwayMeta.trackLead === "function") {
        window.RunwayMeta.trackLead();
        return;
      }
      if (typeof window.fbq === "function" && !window.__runwayLeadTracked) {
        window.__runwayLeadTracked = true;
        window.fbq("track", "Lead", {
          content_name: "무료 상담 신청",
          content_category: "초보 창업 패키지",
          currency: "KRW",
          value: 660000,
        });
      }
    } catch (error) {
      console.warn("[contactLead] Lead pixel skipped", error);
    }
  }

  function formatAdChannelLabel(value) {
    if (!value) return "";
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        if (part === "sns") return "SNS 마케팅";
        if (part === "db") return "리드 광고 운영";
        if (part === "other") return "기타";
        return part;
      })
      .join(", ");
  }

  async function submitLead(payload) {
    console.log("contact form submit started");
    console.log("[contactLead] payload", payload);

    const response = await fetch(LEAD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("[contactLead] response status", response.status);

    let result = null;
    try {
      result = await response.json();
      console.log("[contactLead] response body", result);
    } catch (parseError) {
      console.error("[contactLead] response JSON parse failed", parseError);
    }

    if (!response.ok || !result?.success) {
      const message = result?.message || MSG_ERROR;
      throw new Error(message);
    }

    return result;
  }

  function formatPhoneInput(event) {
    let value = event.target.value.replace(/[^0-9]/g, "");
    if (value.length > 3 && value.length <= 7) {
      value = value.slice(0, 3) + "-" + value.slice(3);
    } else if (value.length > 7) {
      value = value.slice(0, 3) + "-" + value.slice(3, 7) + "-" + value.slice(7, 11);
    }
    event.target.value = value;
  }

  function bindConsultSuccessTop(root) {
    const scope = root || document;
    scope.querySelectorAll(".js-consult-success-top").forEach((btn) => {
      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function showPackageConsultSuccess(form, successEl) {
    const section = form && form.closest(".bp-contact");
    if (section) {
      section.classList.add("is-success");
      const grid = section.querySelector(".bp-contact-grid");
      if (grid) grid.setAttribute("aria-hidden", "true");
    }
    if (successEl) {
      successEl.hidden = false;
      successEl.removeAttribute("hidden");
      successEl.style.display = "";
    }
    bindConsultSuccessTop(successEl || section || document);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function initContactDetailForm(options) {
    const config = options || {};
    const submitButtonText = config.submitButtonText || "상담신청";
    const pageSource = config.pageSource || DEFAULT_PAGE_SOURCE;

    const form = document.getElementById("contactDetailForm");
    const successEl = document.getElementById("detailFormSuccess");
    if (!form) return;
    if (form.dataset.runwayLeadBound === "1") return;
    form.dataset.runwayLeadBound = "1";

    let isSubmitting = false;
    const detailSubmitButton = document.getElementById("detailSubmitButton");
    const detailSubmitButtonText = document.getElementById("detailSubmitButtonText");
    const detailFormFeedback = document.getElementById("detailFormFeedback");

    function setDetailSubmitStatus(status) {
      if (!detailSubmitButton || !detailSubmitButtonText || !detailFormFeedback) {
        if (detailSubmitButton && status === "loading") detailSubmitButton.disabled = true;
        if (detailSubmitButton && status !== "loading") detailSubmitButton.disabled = false;
        if (detailSubmitButtonText && status === "loading") detailSubmitButtonText.textContent = MSG_LOADING;
        return;
      }

      detailSubmitButton.classList.remove("is-loading");
      detailFormFeedback.classList.remove("loading", "success", "error");
      detailFormFeedback.style.display = "none";
      detailFormFeedback.textContent = "";

      if (status === "loading") {
        isSubmitting = true;
        detailSubmitButton.disabled = true;
        detailSubmitButton.classList.add("is-loading");
        detailSubmitButtonText.textContent = MSG_LOADING;
        detailFormFeedback.classList.add("loading");
        detailFormFeedback.style.display = "block";
        detailFormFeedback.textContent = MSG_LOADING;
        return;
      }

      isSubmitting = false;
      detailSubmitButton.disabled = false;
      detailSubmitButtonText.textContent = submitButtonText;

      if (status === "error") {
        detailFormFeedback.classList.add("error");
        detailFormFeedback.style.display = "block";
        detailFormFeedback.textContent = MSG_ERROR;
      }
    }

    const detailPhone = document.getElementById("detail-phone");
    if (detailPhone) {
      detailPhone.addEventListener("input", formatPhoneInput);
    }

    const privacyToggle = form.querySelector(".privacy-toggle");
    const privacyContent = form.querySelector(".privacy-content");
    if (privacyToggle && privacyContent) {
      privacyToggle.addEventListener("click", function () {
        if (privacyContent.style.display === "none") {
          privacyContent.style.display = "block";
          privacyToggle.textContent = "개인정보 처리방침 접기";
        } else {
          privacyContent.style.display = "none";
          privacyToggle.textContent = "개인정보 처리방침 보기";
        }
      });
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (isSubmitting) return;

      const privacyCheck = document.getElementById("detail-privacy");
      if (!privacyCheck || !privacyCheck.checked) {
        alert("개인정보 수집 및 이용에 동의해주세요.");
        return;
      }

      const name = document.getElementById("detail-name")?.value?.trim() || "";
      const phone = document.getElementById("detail-phone")?.value?.trim() || "";
      const company = document.getElementById("detail-company")?.value?.trim() || "";
      const businessType = document.getElementById("detail-industry")?.value?.trim() || "";
      const region = document.getElementById("detail-region")?.value?.trim() || "";
      const message =
        form.querySelector('input[name="detail-situation"]:checked')?.value?.trim() ||
        document.getElementById("detail-message")?.value?.trim() ||
        "";
      const tracking = getTrackingContext(pageSource);

      if (!name || !phone || !company || !businessType || !region || !message) {
        alert("이름, 전화번호, 상호명, 업종, 사업장지역, 현재 상황은 필수 항목입니다.");
        return;
      }

      setDetailSubmitStatus("loading");

      const packageType = detectPackageType(config.packageType);
      const payload = {
        source: "contact_us",
        sessionKey: `contact-us-detail-${Date.now()}`,
        name,
        company,
        companyName: company,
        phone,
        businessType,
        business_type: businessType,
        industry: businessType,
        region,
        business_region: region,
        current_status: message,
        goal: message,
        packageType,
        package_type: packageType,
        serviceType: packageType,
        privacyConsent: true,
        privacyAgreed: true,
        pageSource: tracking.pageSource,
        referrer: tracking.referrer,
        utmSource: tracking.utmSource,
        utmMedium: tracking.utmMedium,
        utmCampaign: tracking.utmCampaign,
        payload: {
          name,
          phone,
          company,
          industry: businessType,
          region,
          current_status: message,
          package_type: packageType,
          source: "contact_us",
          page_source: tracking.pageSource,
          referrer: tracking.referrer,
          utm_source: tracking.utm_source,
          utm_medium: tracking.utm_medium,
          utm_campaign: tracking.utm_campaign,
        },
      };

      try {
        await submitLead(applyAttribution(payload, tracking));
        trackLeadOnce();
        form.reset();
        setDetailSubmitStatus("idle");
        showPackageConsultSuccess(form, successEl);
      } catch (error) {
        console.error("[contactDetailForm] lead submit failed:", error);
        setDetailSubmitStatus("error");
      }
    });
  }

  function initContactModalForm(options) {
    const config = options || {};
    const pageSource = config.pageSource || DEFAULT_PAGE_SOURCE;

    const modal = document.getElementById("contactModal");
    const contactForm = document.getElementById("contactForm");
    const successMessage = document.getElementById("successMessage");
    const closeBtn = document.querySelector(".close");

    if (!modal || !contactForm || !successMessage) return;
    if (contactForm.dataset.runwayLeadBound === "1") return;
    contactForm.dataset.runwayLeadBound = "1";

    function resetForm() {
      contactForm.style.display = "block";
      successMessage.style.display = "none";
      contactForm.reset();
    }

    if (closeBtn) {
      closeBtn.onclick = function () {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
        resetForm();
      };
    }

    window.addEventListener("click", function (event) {
      if (event.target === modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
        resetForm();
      }
    });

    const phoneInput = document.getElementById("phone");
    if (phoneInput) {
      phoneInput.addEventListener("input", formatPhoneInput);
    }

    contactForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const name = document.getElementById("name")?.value?.trim() || "";
      const company = document.getElementById("company")?.value?.trim() || "";
      const phone = document.getElementById("phone")?.value?.trim() || "";
      const industry = document.getElementById("industry")?.value?.trim() || "";
      const message = document.getElementById("message")?.value?.trim() || "";
      const createdAt = new Date().toISOString();
      const tracking = getTrackingContext(pageSource);

      if (!name || !phone || !industry) {
        alert("필수 항목을 모두 입력해주세요.");
        return;
      }

      if (!company) {
        alert("회사명 또는 매장명을 입력해 주세요.");
        return;
      }

      const formData = {
        name,
        company,
        phone,
        industry,
        businessType: industry,
        message,
        privacyConsent: true,
        privacyAgreed: true,
        createdAt,
        timestamp: new Date().toLocaleString("ko-KR"),
        source: tracking.pageSource,
        pageSource: tracking.pageSource,
        referrer: tracking.referrer,
        utm_source: tracking.utm_source,
        utm_medium: tracking.utm_medium,
        utm_campaign: tracking.utm_campaign,
      };

      try {
        await submitLead(
          applyAttribution(
            {
              source: "contact_us",
              sessionKey: `contact-us-${Date.now()}`,
              businessType: formData.businessType,
              region: "미입력",
              monthlyBudget: "미입력",
              adBudget: "미입력",
              goal: formData.message || "상담 문의",
              message: formData.message,
              contact: [formData.name, formData.phone].filter(Boolean).join(" / "),
              name: formData.name,
              company: formData.company,
              companyName: formData.company,
              phone: formData.phone,
              privacyConsent: true,
              privacyAgreed: true,
              createdAt,
              pageSource: tracking.pageSource,
              referrer: tracking.referrer,
              utmSource: tracking.utmSource,
              utmMedium: tracking.utmMedium,
              utmCampaign: tracking.utmCampaign,
              payload: formData,
            },
            tracking,
          ),
        );
        trackLeadOnce();

        contactForm.reset();
        contactForm.style.display = "none";
        successMessage.style.display = "block";

        setTimeout(() => {
          modal.style.display = "none";
          document.body.style.overflow = "auto";
          resetForm();
        }, 3000);
      } catch (error) {
        console.error("[contactForm] lead submit failed:", error);
        alert("신청 접수 중 문제가 발생했습니다.\n아래 이메일 또는 카카오톡으로 문의해주세요.");
      }
    });

    window.RunwayContactLead = window.RunwayContactLead || {};
    window.RunwayContactLead.openModal = function () {
      modal.style.display = "block";
      document.body.style.overflow = "hidden";
    };
  }

  function initGrowthContactForm(options) {
    const config = options || {};
    const form = document.getElementById("growthContactForm");
    const successEl = document.getElementById("growthFormSuccess");
    if (!form) return;
    if (form.dataset.runwayLeadBound === "1") return;
    form.dataset.runwayLeadBound = "1";

    let isSubmitting = false;
    const submitButton = document.getElementById("growthSubmitButton");
    const submitButtonTextEl = document.getElementById("growthSubmitButtonText");
    const feedbackEl = document.getElementById("growthFormFeedback");
    const idleLabel =
      (submitButtonTextEl && submitButtonTextEl.textContent.trim()) ||
      (submitButton && submitButton.textContent.trim()) ||
      "무료 사업 성장 상담 신청하기 →";
    const phoneInput = document.getElementById("growth-phone");
    if (phoneInput) phoneInput.addEventListener("input", formatPhoneInput);

    function setStatus(status) {
      const textTarget = submitButtonTextEl || submitButton;
      if (status === "loading") {
        isSubmitting = true;
        if (submitButton) submitButton.disabled = true;
        if (textTarget) textTarget.textContent = MSG_LOADING;
        if (feedbackEl) {
          feedbackEl.className = "detail-form-feedback loading";
          feedbackEl.style.display = "block";
          feedbackEl.textContent = MSG_LOADING;
        }
        return;
      }

      isSubmitting = false;
      if (submitButton) submitButton.disabled = false;
      if (textTarget) textTarget.textContent = idleLabel;
      if (status === "error" && feedbackEl) {
        feedbackEl.className = "detail-form-feedback error";
        feedbackEl.style.display = "block";
        feedbackEl.textContent = MSG_ERROR;
      }
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (isSubmitting) return;

      const name = document.getElementById("growth-name")?.value?.trim() || "";
      const phone = document.getElementById("growth-phone")?.value?.trim() || "";
      const company = document.getElementById("growth-company")?.value?.trim() || "";
      const businessType = document.getElementById("growth-industry")?.value?.trim() || "";
      const region = document.getElementById("growth-region")?.value?.trim() || "";
      const currentStatus =
        form.querySelector('input[name="marketing_status"]:checked')?.value?.trim() || "";
      const privacy = document.getElementById("growth-privacy");

      if (!name || !phone || !company || !businessType || !region || !currentStatus) {
        alert("필수 항목을 모두 입력해 주세요.");
        return;
      }
      if (!privacy || !privacy.checked) {
        alert("개인정보 수집 및 이용에 동의해 주세요.");
        return;
      }
      if (phone.replace(/[^0-9]/g, "").length < 10) {
        alert("전화번호를 올바르게 입력해 주세요.");
        return;
      }

      setStatus("loading");
      const tracking = getTrackingContext(config.pageSource || DEFAULT_PAGE_SOURCE);
      const packageType = detectPackageType(config.packageType || "growth");

      try {
        await submitLead(
          applyAttribution(
            {
              source: "contact_us",
              sessionKey: `contact-us-growth-${Date.now()}`,
              name,
              company,
              companyName: company,
              phone,
              businessType,
              business_type: businessType,
              industry: businessType,
              region,
              business_region: region,
              current_status: currentStatus,
              goal: currentStatus,
              packageType,
              package_type: packageType,
              serviceType: packageType,
              privacyConsent: true,
              privacyAgreed: true,
              pageSource: tracking.pageSource,
              referrer: tracking.referrer,
              utmSource: tracking.utmSource,
              utmMedium: tracking.utmMedium,
              utmCampaign: tracking.utmCampaign,
              payload: {
                name,
                phone,
                company,
                industry: businessType,
                region,
                current_status: currentStatus,
                package_type: packageType,
                source: "contact_us",
                page_source: tracking.pageSource,
                referrer: tracking.referrer,
                utm_source: tracking.utm_source,
                utm_medium: tracking.utm_medium,
                utm_campaign: tracking.utm_campaign,
              },
            },
            tracking,
          ),
        );
        trackLeadOnce();
        form.reset();
        setStatus("idle");
        showPackageConsultSuccess(form, successEl);
      } catch (error) {
        console.error("[growthContactForm] lead submit failed:", error);
        setStatus("error");
      }
    });
  }

  window.RunwayContactLead = {
    submitLead,
    formatPhoneInput,
    initContactDetailForm,
    initContactModalForm,
    initGrowthContactForm,
  };

  function bootstrapContactForms() {
    if (window.__runwayContactLeadBootstrapped) return;

    const hasDetail = document.getElementById("contactDetailForm");
    const hasModal = document.getElementById("contactForm");
    const hasGrowth = document.getElementById("growthContactForm");
    if (!hasDetail && !hasModal && !hasGrowth) return;

    window.__runwayContactLeadBootstrapped = true;
    bindConsultSuccessTop(document);
    initContactModalForm();

    const btnText = document.getElementById("detailSubmitButtonText")?.textContent?.trim();
    initContactDetailForm({
      submitButtonText: btnText || "상담신청",
      packageType: detectPackageType(),
    });
    initGrowthContactForm({ packageType: "growth" });
  }

  bootstrapContactForms();
})();
