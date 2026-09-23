export const accountFields = {
  password: { type: String, required: true, select: false },
  tokenVersion: { type: Number, default: 0, select: false },
  sessionCounter: { type: Number, default: 0, select: false },
  active: { type: Boolean, default: true, select: false },
};
export function safeAccount() {
  const { password, tokenVersion, sessionCounter, active, isCore, __v, ...safe } = this.toObject();
  return safe;
}
