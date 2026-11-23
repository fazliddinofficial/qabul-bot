// CRM (metafor.uz) dan parolsiz kirish: CRM serveri CEO uchun bir martalik, 60 soniyalik
// imzolangan havola beradi. Imzo HR_SSO_SECRET bilan (HMAC-SHA256) — ikkala serverda bir xil.
// Token: base64url(JSON payload) + "." + base64url(HMAC(payloadPart))
import crypto from "crypto";

const MAX_AGE_SEC = 120;
const usedNonces = new Map(); // nonce -> amal qilish muddati (ms)

function b64urlDecode(text) {
  return Buffer.from(String(text).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function forgetOldNonces(now) {
  for (const [nonce, until] of usedNonces) {
    if (until < now) usedNonces.delete(nonce);
  }
}

export class SsoError extends Error {}

export function verifyHrToken(token, secret, now = Date.now()) {
  if (!secret || secret.length < 32) throw new SsoError("HR_SSO_SECRET sozlanmagan");
  const [payloadPart, signPart, extra] = String(token || "").split(".");
  if (!payloadPart || !signPart || extra !== undefined) throw new SsoError("Havola buzilgan");

  const expected = crypto.createHmac("sha256", secret).update(payloadPart).digest();
  const given = b64urlDecode(signPart);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new SsoError("Imzo noto‘g‘ri");
  }

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(payloadPart).toString("utf8"));
  } catch {
    throw new SsoError("Havola buzilgan");
  }
  const nowSec = Math.floor(now / 1000);
  if (payload.aud !== "qabul-hr") throw new SsoError("Havola bu panel uchun emas");
  if (payload.role !== "CEO") throw new SsoError("Faqat CEO kira oladi");
  if (!Number.isFinite(payload.exp) || payload.exp < nowSec) throw new SsoError("Havola eskirgan — CRM’da HR ni qayta bosing");
  if (!Number.isFinite(payload.iat) || payload.iat > nowSec + 30 || nowSec - payload.iat > MAX_AGE_SEC) {
    throw new SsoError("Havola eskirgan — CRM’da HR ni qayta bosing");
  }
  if (typeof payload.nonce !== "string" || payload.nonce.length < 16) throw new SsoError("Havola buzilgan");

  forgetOldNonces(now);
  if (usedNonces.has(payload.nonce)) throw new SsoError("Bu havola allaqachon ishlatilgan — CRM’da HR ni qayta bosing");
  usedNonces.set(payload.nonce, (payload.exp + 60) * 1000);
  return payload;
}

// Test va CRM tomoni uchun namuna (CRM xuddi shunday imzolaydi)
export function signHrToken(payload, secret) {
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signPart = crypto.createHmac("sha256", secret).update(payloadPart).digest("base64url");
  return `${payloadPart}.${signPart}`;
}
