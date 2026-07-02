/**
 * Runway marketing pages — contact / consultation lead submit (shared).
 */
(function () {
  const LEAD_API = "/api/consultation-lead";
  const DEFAULT_PAGE_SOURCE = "runwayads.kr";

  const ERROR_HTML =
    "<strong>신청 접수 중 문제가 발생했습니다.</strong>" +
    "<p>아래 이메일 또는 카카오톡으로 문의해주세요.</p>";

  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"];

  function persistUtmFromUrl() {
    const params = new URLSearchParams(window.location.search);
    UTM_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) {
        sessionStorage.setItem(`runway_${key}`, value);
      }
    });
  }

  function getTrackingContext(pageSource) {
    persistUtmFromUrl();
    const params = new URLSearchParams(window.location.search);

    const readUtm = (key) => params.get(key) || sessionStorage.getItem(`runway_${key}`) || "";

    const pathLabel = window.location.pathname === "/" ? "" : window.location.pathname;

    return {
      pageSource: `${pageSource || DEFAULT_PAGE_SOURCE}${pathLabel}`,
      referrer: document.referrer || "",
      utm_source: readUtm("utm_source"),
      utm_medium: readUtm("utm_medium"),
      utm_campaign: readUtm("utm_campaign"),
      utmSource: readUtm("utm_source"),
      utmMedium: readUtm("utm_medium"),
      utmCampaign: readUtm("utm_campaign"),
    };
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
      const message = result?.message || `상담 접수 저장에 실패했습니다. (${response.status})`;
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
    const detailSubmitSpinner = document.getElementById("detailSubmitSpinner");
    const detailSubmitButtonText = document.getElementById("detailSubmitButtonText");
    const detailFormFeedback = document.getElementById("detailFormFeedback");

    function setDetailSubmitStatus(status) {
      if (!detailSubmitButton || !detailSubmitButtonText || !detailSubmitSpinner || !detailFormFeedback) {
        return;
      }

      detailSubmitButton.classList.remove("is-loading");
      detailFormFeedback.classList.remove("loading", "success", "error");
      detailFormFeedback.style.display = "none";
      detailFormFeedback.innerHTML = "";

      if (status === "loading") {
        isSubmitting = true;
        detailSubmitButton.disabled = true;
        detailSubmitButton.classList.add("is-loading");
        detailSubmitButtonText.textContent = "신청 내용을 접수하고 있습니다...";
        detailFormFeedback.classList.add("loading");
        detailFormFeedback.style.display = "block";
        detailFormFeedback.textContent = "신청 내용을 접수하고 있습니다...";
        return;
      }

      isSubmitting = false;
      detailSubmitButton.disabled = false;
      detailSubmitButtonText.textContent = submitButtonText;

      if (status === "error") {
        detailFormFeedback.classList.add("error");
        detailFormFeedback.style.display = "block";
        detailFormFeedback.innerHTML = ERROR_HTML;
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
      const message = document.getElementById("detail-message")?.value?.trim() || "";
      const createdAt = new Date().toISOString();
      const tracking = getTrackingContext(pageSource);

      if (!name || !phone || !businessType) {
        alert("이름, 연락처, 업종은 필수 항목입니다.");
        return;
      }

      if (!company) {
        alert("회사명 또는 매장명을 입력해 주세요.");
        return;
      }

      setDetailSubmitStatus("loading");

      const payload = {
        source: "contact_us",
        sessionKey: `contact-us-detail-${Date.now()}`,
        businessType,
        region: "미입력",
        monthlyBudget: "미입력",
        adBudget: "미입력",
        adChannel: null,
        goal: message || "상담 문의",
        message: message || null,
        contact: [name, phone].filter(Boolean).join(" / "),
        name,
        company,
        companyName: company,
        phone,
        privacyConsent: true,
        privacyAgreed: true,
        createdAt,
        pageSource: tracking.pageSource,
        referrer: tracking.referrer,
        utmSource: tracking.utmSource,
        utmMedium: tracking.utmMedium,
        utmCampaign: tracking.utmCampaign,
        payload: {
          source: tracking.pageSource,
          pageSource: tracking.pageSource,
          privacyConsent: true,
          privacyAgreed: true,
          createdAt,
          referrer: tracking.referrer,
          utm_source: tracking.utm_source,
          utm_medium: tracking.utm_medium,
          utm_campaign: tracking.utm_campaign,
          name,
          companyName: company,
          phone,
          businessType,
          adBudget: null,
          adChannel: null,
          message,
        },
      };

      try {
        await submitLead(payload);
        form.reset();
        setDetailSubmitStatus("idle");
        form.style.display = "none";
        if (successEl) successEl.style.display = "block";
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
        await submitLead({
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
        });

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

  window.RunwayContactLead = {
    submitLead,
    formatPhoneInput,
    initContactDetailForm,
    initContactModalForm,
  };

  function bootstrapContactForms() {
    if (window.__runwayContactLeadBootstrapped) return;

    const hasDetail = document.getElementById("contactDetailForm");
    const hasModal = document.getElementById("contactForm");
    if (!hasDetail && !hasModal) return;

    window.__runwayContactLeadBootstrapped = true;
    initContactModalForm();

    const btnText = document.getElementById("detailSubmitButtonText")?.textContent?.trim();
    initContactDetailForm({ submitButtonText: btnText || "상담신청" });
  }

  bootstrapContactForms();
})();
