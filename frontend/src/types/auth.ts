export type TJwtClaims = {
  sub: string;
  tid: string;
  role: "admin" | "manager" | "user" | string;
  email: string;
  typ: "access";
  jti: string;
  exp: number;
  iat: number;
};

export type TAuthPayload = {
  tenantId: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  tenantSlug?: string;
};
