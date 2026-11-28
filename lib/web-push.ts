import { createCipheriv, createECDH, createHmac, createPrivateKey, sign, randomBytes } from "node:crypto";

type PushSubscription = { id: string; endpoint: string; p256dh: string; auth: string };
const b64url = (value: Buffer | string) => Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
function hkdfExtract(salt: Buffer, ikm: Buffer) { return createHmac("sha256", salt).update(ikm).digest(); }
function hkdfExpand(prk: Buffer, info: Buffer, length: number) {
  let previous = Buffer.alloc(0), output = Buffer.alloc(0), counter = 1;
  while (output.length < length) {
    previous = createHmac("sha256", prk).update(Buffer.concat([previous, info, Buffer.from([counter])])).digest();
    output = Buffer.concat([output, previous]); counter++;
  }
  return output.subarray(0, length);
}
function encryptPayload(subscription: PushSubscription, payload: string) {
  const uaPublic = Buffer.from(subscription.p256dh, "base64url");
  const authSecret = Buffer.from(subscription.auth, "base64url");
  if (uaPublic.length !== 65 || authSecret.length < 16) throw new Error("Invalid push subscription encryption keys.");
  const ecdh = createECDH("prime256v1"); ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(uaPublic);
  const authPrk = hkdfExtract(authSecret, sharedSecret);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0", "utf8"), uaPublic, asPublic]);
  const ikm = hkdfExpand(authPrk, keyInfo, 32);
  const salt = randomBytes(16);
  const prk = hkdfExtract(salt, ikm);
  const cek = hkdfExpand(prk, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdfExpand(prk, Buffer.from("Content-Encoding: nonce\0"), 12);
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const plaintext = Buffer.concat([Buffer.from(payload, "utf8"), Buffer.from([2])]);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096, 0);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, ciphertext]);
}
function createVapidToken(endpoint: string) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@solemarket.ph";
  if (!publicKey || !privateKey) throw new Error("Push notification keys are not configured.");
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const body = b64url(JSON.stringify({ aud: audience, exp: now + 12 * 60 * 60, sub: subject }));
  const unsigned = header + "." + body;
  const d = Buffer.from(privateKey, "base64url"), pub = Buffer.from(publicKey, "base64url");
  if (d.length !== 32 || pub.length !== 65) throw new Error("Invalid VAPID key format.");
  const jwk = { kty: "EC", crv: "P-256", d: b64url(d), x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)) };
  const key = createPrivateKey({ key: jwk, format: "jwk" });
  const signature = sign("sha256", Buffer.from(unsigned), { key, dsaEncoding: "ieee-p1363" });
  return { token: unsigned + "." + b64url(signature), publicKey };
}
export async function sendWebPush(subscription: PushSubscription, payload: { title: string; body: string; url?: string }) {
  const { token, publicKey } = createVapidToken(subscription.endpoint);
  const body = encryptPayload(subscription, JSON.stringify(payload));
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: "vapid t=" + token + ", k=" + publicKey,
      "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream",
      TTL: "86400", Urgency: "normal",
    },
    body, cache: "no-store",
  });
  return { ok: response.ok, status: response.status };
}
