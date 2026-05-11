const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface ApiError {
  message: string;
  statusCode: number;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw error;
  }

  return res.json();
}

// Auth
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    request<{ access_token: string; user: { id: string; email: string; name: string | null } }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; user: { id: string; email: string; name: string | null } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: (token: string) =>
    request<{ id: string; email: string; name: string | null }>("/api/auth/me", {
      token,
    }),
};

// Agent Templates
export const templatesApi = {
  list: () => request<any[]>("/api/agent-templates"),
};

// Agent Runs
export const runsApi = {
  list: (token: string) => request<any[]>("/api/agent-runs", { token }),
  create: (token: string, data: { agentTemplateId: string }) =>
    request<any>("/api/agent-runs", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),
  stop: (token: string, id: string) =>
    request<any>(`/api/agent-runs/${id}/stop`, {
      method: "PUT",
      token,
    }),
  restart: (token: string, id: string) =>
    request<any>(`/api/agent-runs/${id}/restart`, {
      method: "PUT",
      token,
    }),
  remove: (token: string, id: string) =>
    request<any>(`/api/agent-runs/${id}`, {
      method: "DELETE",
      token,
    }),
};

// Secrets
export const secretsApi = {
  list: (token: string) => request<any[]>("/api/secrets", { token }),
  create: (token: string, data: { name: string; provider: string; value: string }) =>
    request<any>("/api/secrets", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),
  remove: (token: string, id: string) =>
    request<any>(`/api/secrets/${id}`, {
      method: "DELETE",
      token,
    }),
};
