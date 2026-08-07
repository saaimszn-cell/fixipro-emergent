import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({ baseURL: API, withCredentials: true });

let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried && !original.url.includes("/auth/")) {
      original._retried = true;
      try {
        refreshing = refreshing || api.post("/auth/refresh");
        await refreshing;
        refreshing = null;
        return api(original);
      } catch {
        refreshing = null;
      }
    }
    return Promise.reject(error);
  }
);

export function errMsg(e, fallback = "Something went wrong. Please try again.") {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg || JSON.stringify(d)).join(" ");
  return fallback;
}

export const fmtGBP = (n) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n ?? 0);

export const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date) ? String(d) : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export default api;
