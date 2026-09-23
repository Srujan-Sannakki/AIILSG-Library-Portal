import { z } from 'zod';
export const text = z.string().trim().min(1).max(200);
export const password = z.string().min(12).max(72).refine(v => Buffer.byteLength(v, 'utf8') <= 72, 'Maximum 72 UTF-8 bytes');
export const sid = z.string().regex(/^[A-Za-z0-9]{15}$/);
export const phone = z.string().regex(/^(?:\d{10})?$/);
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v), 'Invalid date');
export const money = z.number().finite().min(0).max(100000000);
export const count = z.number().int().min(0).max(100000000);
export const identifier = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
export const profile = z.object({ name: text.optional(), phone: phone.optional() }).strict();
export const dates = z.object({ validFrom: date, validUntil: date }).refine(v => v.validFrom <= v.validUntil, 'Invalid validity range');
export function pageQuery(query) {
  return z.object({ offset: z.coerce.number().int().min(0).max(1000000).default(0), limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(query);
}
export async function list(Model, query, filter = {}, map = x => x) {
  const { offset, limit } = pageQuery(query);
  const [items, total] = await Promise.all([Model.find(filter).sort({ _id: -1 }).skip(offset).limit(limit), Model.countDocuments(filter)]);
  return { items: items.map(map), total, offset, limit };
}
export const objectId = value => /^[a-f0-9]{24}$/i.test(value);
export function userFilter(value) { identifier.parse(value); return objectId(value) ? { _id: value } : { sid: value }; }
