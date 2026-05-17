import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  FiSend,
  FiUsers,
  FiMapPin,
  FiBriefcase,
  FiCheckCircle,
} from "react-icons/fi";
import FadeSection from "./FadeSection";
import "./DonateView.css";

/* ────────────────────────────────────────────────────────────────────
 * PartnerInquiryView (renamed UX, file kept as DonateView.jsx to minimize
 * diff against existing route wiring in App.jsx and Sidebar). Builds a
 * mailto link from the form fields and ships to daizhe@berkeley.edu.
 *
 * Donation/payment UI is intentionally removed. This is a B2G sales
 * intake — Three-North project offices, prefecture forestry bureaus,
 * autonomous-region林草局, research institutes that want a pilot region.
 * ──────────────────────────────────────────────────────────────────── */

const INQUIRY_EMAIL = "daizhe@berkeley.edu";

const REGION_OPTIONS = [
  { value: "xinjiang", en: "Xinjiang", zh: "新疆" },
  { value: "neimenggu", en: "Inner Mongolia", zh: "内蒙古" },
  { value: "gansu", en: "Gansu", zh: "甘肃" },
  { value: "ningxia", en: "Ningxia", zh: "宁夏" },
  { value: "qinghai", en: "Qinghai", zh: "青海" },
  { value: "shaanxi", en: "Shaanxi", zh: "陕西" },
  { value: "other", en: "Other / multi-region", zh: "其他 / 跨区域" },
];

function buildMailto({ org, dept, name, title, email, phone, region, message }, zh) {
  const subject = `[Partner Inquiry] ${org || "(unspecified org)"} — ${region || "region TBD"}`;
  const bodyLines = [
    zh ? "三北防护林监测决策系统 — 试点申请" : "Three-North Shelterbelt Decision System — Pilot inquiry",
    "",
    `${zh ? "单位名" : "Organization"}: ${org}`,
    `${zh ? "部门" : "Department"}: ${dept}`,
    `${zh ? "姓名" : "Name"}: ${name}`,
    `${zh ? "职位" : "Title"}: ${title}`,
    `${zh ? "邮箱" : "Email"}: ${email}`,
    `${zh ? "电话" : "Phone"}: ${phone}`,
    `${zh ? "关注区域" : "Region of interest"}: ${region}`,
    "",
    `${zh ? "留言" : "Message"}:`,
    message || "(none)",
  ];
  return `mailto:${INQUIRY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    bodyLines.join("\n")
  )}`;
}

export default function DonateView() {
  const { lang } = useLanguage();
  const zh = lang === "zh";

  const [form, setForm] = useState({
    org: "",
    dept: "",
    name: "",
    title: "",
    email: "",
    phone: "",
    region: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const setField = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    const url = buildMailto(form, zh);
    // Trigger the user's mail client. Use window.location to avoid popup blockers.
    window.location.href = url;
    setSubmitted(true);
  };

  return (
    <div className="donate-view partner-view">
      {/* Hero */}
      <div className="donate-hero partner-hero">
        <div className="donate-hero-content">
          <h1>{zh ? "申请试点" : "Partner with us"}</h1>
          <p>
            {zh
              ? "如果你是三北防护林项目办、地州林业局、自治区林草局或合作研究机构——我们正在挑选 2-3 个试点区域。提交下方表单，我们 7 个工作日内联系。"
              : "If you run a Three-North project office, prefecture forestry bureau, autonomous-region forestry/grassland bureau, or research institute working on the green belt — we are taking 2-3 pilot regions. Submit below; we respond within 7 business days."}
          </p>
          <div className="partner-hero-pillrow">
            <span className="partner-hero-pill">
              <FiBriefcase size={12} aria-hidden="true" />
              {zh ? "面向 B2G" : "Government partners"}
            </span>
            <span className="partner-hero-pill">
              <FiMapPin size={12} aria-hidden="true" />
              {zh ? "三北全域" : "Three-North-wide"}
            </span>
            <span className="partner-hero-pill">
              <FiUsers size={12} aria-hidden="true" />
              {zh ? "学术合作可谈" : "Research collaboration OK"}
            </span>
          </div>
        </div>
      </div>

      {/* Inquiry form */}
      <FadeSection className="partner-form-section">
        <h2>{zh ? "试点申请表" : "Pilot inquiry form"}</h2>
        <p className="partner-form-desc">
          {zh
            ? "提交后将打开你的邮件客户端，预填到 daizhe@berkeley.edu。无后端、无注册、不留账户。"
            : "Submitting opens your email client with a draft to daizhe@berkeley.edu. No backend, no signup, no account."}
        </p>

        {submitted ? (
          <div className="partner-success" role="status" aria-live="polite">
            <FiCheckCircle size={32} aria-hidden="true" />
            <h3>{zh ? "邮件已生成" : "Email drafted"}</h3>
            <p>
              {zh
                ? "如果你的邮件客户端没有自动打开，请直接发邮件到 "
                : "If your mail client didn't open automatically, email "}
              <a href={`mailto:${INQUIRY_EMAIL}`}>{INQUIRY_EMAIL}</a>
              {zh ? "。" : "."}
            </p>
            <button
              type="button"
              className="partner-form-reset"
              onClick={() => setSubmitted(false)}
            >
              {zh ? "再提交一次" : "Submit another"}
            </button>
          </div>
        ) : (
          <form className="partner-form" onSubmit={onSubmit}>
            <div className="partner-form-grid">
              <label className="partner-field">
                <span className="partner-label">
                  {zh ? "单位名" : "Organization"} <em>*</em>
                </span>
                <input
                  type="text"
                  required
                  value={form.org}
                  onChange={setField("org")}
                  placeholder={zh ? "例如：新疆林业和草原局" : "e.g. Xinjiang Forestry & Grassland Bureau"}
                />
              </label>

              <label className="partner-field">
                <span className="partner-label">{zh ? "部门" : "Department"}</span>
                <input
                  type="text"
                  value={form.dept}
                  onChange={setField("dept")}
                  placeholder={zh ? "例如：三北防护林项目办" : "e.g. Three-North Project Office"}
                />
              </label>

              <label className="partner-field">
                <span className="partner-label">
                  {zh ? "姓名" : "Name"} <em>*</em>
                </span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={setField("name")}
                />
              </label>

              <label className="partner-field">
                <span className="partner-label">{zh ? "职位" : "Title"}</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={setField("title")}
                  placeholder={zh ? "例如：项目办主任 / 副局长" : "e.g. Project office director"}
                />
              </label>

              <label className="partner-field">
                <span className="partner-label">
                  {zh ? "邮箱" : "Email"} <em>*</em>
                </span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={setField("email")}
                />
              </label>

              <label className="partner-field">
                <span className="partner-label">{zh ? "电话" : "Phone"}</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={setField("phone")}
                  placeholder="+86 ..."
                />
              </label>

              <label className="partner-field partner-field-full">
                <span className="partner-label">{zh ? "关注区域" : "Region of interest"}</span>
                <select value={form.region} onChange={setField("region")}>
                  <option value="">
                    {zh ? "选择一个区域..." : "Pick a region..."}
                  </option>
                  {REGION_OPTIONS.map((r) => (
                    <option key={r.value} value={zh ? r.zh : r.en}>
                      {zh ? r.zh : r.en}
                    </option>
                  ))}
                </select>
              </label>

              <label className="partner-field partner-field-full">
                <span className="partner-label">{zh ? "留言" : "Message"}</span>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={setField("message")}
                  placeholder={
                    zh
                      ? "试点目标、关注的 action 类别（种植 / 灌溉 / 巡检 / 预警）、需要的数据接入、时间窗口..."
                      : "Pilot goal, action category of interest (planting / irrigation / inspection / alert), data integration scope, timeline..."
                  }
                />
              </label>
            </div>

            <div className="partner-form-actions">
              <button type="submit" className="partner-submit">
                <FiSend size={14} aria-hidden="true" />
                {zh ? "提交申请" : "Submit inquiry"}
              </button>
              <span className="partner-form-note">
                {zh
                  ? "我们不收集任何浏览器侧数据，邮件由你的客户端直接发出。"
                  : "We collect nothing client-side. The email is sent by your own mail client."}
              </span>
            </div>
          </form>
        )}
      </FadeSection>

      {/* What partners get */}
      <FadeSection className="partner-what">
        <h2>{zh ? "试点机构能拿到什么" : "What pilot partners get"}</h2>
        <div className="partner-grid">
          <div className="partner-card">
            <strong>{zh ? "数据接入" : "Data integration"}</strong>
            <p>
              {zh
                ? "Sentinel-2 NDVI / SRTM / ERA5 / SMAP 自动接入你所关注区域，无需自建采购流程。"
                : "Sentinel-2 NDVI / SRTM / ERA5 / SMAP wired to your region, no procurement loop."}
            </p>
          </div>
          <div className="partner-card">
            <strong>{zh ? "L3 决策建议" : "L3 recommendations"}</strong>
            <p>
              {zh
                ? "17 类干预动作的推荐输出，附置信度、成本、ETA、审批层级——直接对接项目办备案。"
                : "17 intervention actions with confidence, cost, ETA, approval level — fits project office filings."}
            </p>
          </div>
          <div className="partner-card">
            <strong>{zh ? "可审计的轨迹" : "Auditable trail"}</strong>
            <p>
              {zh
                ? "每条建议的触发数据、审批人、决策时刻全部留痕，年底审计可一键导出。"
                : "Every recommendation logs trigger data, approver, decision time. Year-end audit exports in one click."}
            </p>
          </div>
          <div className="partner-card">
            <strong>{zh ? "可选硬件" : "Optional hardware"}</strong>
            <p>
              {zh
                ? "蛇形巡检机器人 / 无人机巡查 / 滴灌 SCADA hook 可选加，不强卖。"
                : "Snake inspection robot / drone surveys / drip-irrigation SCADA hooks available as add-ons, not bundled."}
            </p>
          </div>
        </div>
      </FadeSection>
    </div>
  );
}
