export type TApiSuccess<T> = {
  success: true;
  data: T;
  message: string;
};

export type TPaged<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export type TTask = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  dueAt: string | null;
  assignedToUserId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type TLead = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: "new" | "contacted" | "qualified" | "won" | "lost";
  assignedToUserId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type TUser = {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "manager" | "user";
  createdAt: string;
  updatedAt: string;
};

export type TNotification = {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};
