type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface QueryParams {
  [key: string]: string | number | boolean | undefined | null;
}

interface JsonBody {
  [key: string]: unknown;
}

interface RequestOptions {
  method?: HttpMethod;
  query?: QueryParams;
  body?: JsonBody;
  headers?: Record<string, string>;
  authToken?: string;
}

function buildQueryString(query?: QueryParams): string {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return `?${params.toString()}`;
}

export async function httpClient<TResponse = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<TResponse> {
  const {
    method = "GET",
    query,
    body,
    headers = {},
    authToken,
  } = options;

  const url = `${import.meta.env.VITE_API_URL}/api${endpoint}${buildQueryString(query)}`;

  const finalHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (authToken) {
    finalHeaders["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const error = await response.json();
      if (typeof error === "object" && error && "error" in error) {
        message = String((error as { error?: unknown }).error ?? message);
      }
    } catch { throw new Error(message); }
  }

  return response.json() as Promise<TResponse>;
}
