export type AuthContext = {
  userId: string;
  tenantId: string;
  role: "admin" | "manager" | "user" | string;
  email: string;
  jti: string;
};
