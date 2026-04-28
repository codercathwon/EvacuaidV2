import * as jose from 'jose';

const jwtSecret = new TextEncoder().encode(process.env.SOS_JWT_SECRET || 'default_insecure_secret_for_dev_mode_only');

export interface SosPayload {
  userId?: string; // empty if anon
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  device_fp?: string;
}

export async function signSosPayload(payload: SosPayload): Promise<string> {
  return await new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Expire quickly as SOS should be immediate
    .sign(jwtSecret);
}

export async function verifySosPayload(token: string): Promise<SosPayload> {
  const { payload } = await jose.jwtVerify(token, jwtSecret);
  return payload as unknown as SosPayload;
}
