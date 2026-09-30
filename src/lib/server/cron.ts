/** Vercel Cron mengirim `Authorization: Bearer ${CRON_SECRET}`. */
export function isCronAuthorized(req: Request, secret: string | undefined = process.env.CRON_SECRET): boolean {
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
