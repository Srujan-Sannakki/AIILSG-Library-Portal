import Session from '../models/Session.js';
import TokenBlacklist from '../models/TokenBlacklist.js';
export async function revokeSessions(accountId, accountType, session) {
  const records = await Session.find({ accountId: String(accountId), accountType }).session(session);
  if (records.length) await TokenBlacklist.bulkWrite(records.map(r => ({ updateOne: { filter: { jti: r.jti }, update: { $setOnInsert: { jti: r.jti, expiresAt: r.expiresAt } }, upsert: true } })), { session });
  await Session.deleteMany({ accountId: String(accountId), accountType }).session(session);
}
