import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter, UNSAFE_withComponentProps, Outlet, UNSAFE_withErrorBoundaryProps, isRouteErrorResponse, Meta, Links, ScrollRestoration, Scripts, useNavigate, Link, useSearchParams } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Toaster$1, toast } from "sonner";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState, useEffect } from "react";
import ky from "ky";
import { ChevronLeft, BarChart3, Package, Settings, FileText, PieChart, Key, User, Bell, TrendingUp, Filter, Plus, Search, MoreVertical, Eye, Code, Download, Copy, Activity, CheckCircle, AlertTriangle, Trash2, Wrench, Bug, Zap, Shield, CreditCard, Save, EyeOff, Check, Mail, ArrowLeft } from "lucide-react";
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Area, PieChart as PieChart$1, Pie, Cell, BarChart, Bar } from "recharts";
import { createPortal } from "react-dom";
const streamTimeout = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext) {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders
    });
  }
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");
    let readyOption = userAgent && isbot(userAgent) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";
    let timeoutId = setTimeout(
      () => abort(),
      streamTimeout + 1e3
    );
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: routerContext, url: request.url }),
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = void 0;
              callback();
            }
          });
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          pipe(body);
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1e3 * 5,
      // Data considered fresh for 5 seconds
      gcTime: 1e3 * 10
      // Keep inactive data for 10 seconds
    }
  }
});
function QueryProvider({ children }) {
  return /* @__PURE__ */ jsx(QueryClientProvider, { client: queryClient, children });
}
const Toaster = ({ ...props }) => {
  return /* @__PURE__ */ jsx(
    Toaster$1,
    {
      theme: "dark",
      className: "toaster group",
      richColors: true,
      ...props
    }
  );
};
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const meta = () => [{
  title: "Kuttl Dashboard - Analytics & Insights"
}, {
  name: "description",
  content: "Monitor your analytics and performance metrics with Kuttl's comprehensive dashboard."
}];
function Layout({
  children
}) {
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      className: cn("min-h-screen bg-gray-50 text-gray-900 font-sans antialiased"),
      children: [children, /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
}
const root = UNSAFE_withComponentProps(function App() {
  return /* @__PURE__ */ jsxs(QueryProvider, {
    children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(Toaster, {})]
  });
});
const ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2({
  error
}) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack;
  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  }
  return /* @__PURE__ */ jsxs("main", {
    className: "container mx-auto p-4 pt-16",
    children: [/* @__PURE__ */ jsx("h1", {
      children: message
    }), /* @__PURE__ */ jsx("p", {
      children: details
    }), stack]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  Layout,
  default: root,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const API_BASE_URL = "http://localhost:8080/api/v1";
const api = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 3e4,
  hooks: {
    beforeRequest: [
      (request) => {
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("auth_token");
          if (token) {
            request.headers.set("Authorization", `Bearer ${token}`);
          }
        }
      }
    ]
  }
});
const authApi = {
  login: async (credentials) => {
    try {
      const response = await api.post("auth/login", { json: credentials }).json();
      localStorage.setItem("auth_token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      console.log("Login successful, token stored:", response.data.token ? "YES" : "NO");
      console.log("User data stored:", response.data.user);
      return response.data;
    } catch (error) {
      if (error.response) {
        const errorData = await error.response.json();
        throw new Error(errorData.error || errorData.message || "Login failed");
      }
      throw error;
    }
  },
  register: async (data) => {
    const response = await api.post("auth/register", { json: data }).json();
    return response.data;
  },
  logout: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  },
  verifyEmail: async (token) => {
    return api.get(`auth/verify-email?token=${token}`).json();
  },
  resendVerification: async (email) => {
    return api.post("auth/resend-verification", { json: { email } }).json();
  },
  forgotPassword: async (email) => {
    return api.post("auth/forgot-password", { json: { email } }).json();
  },
  resetPassword: async (data) => {
    return api.post("auth/reset-password", { json: data }).json();
  },
  changePassword: async (data) => {
    return api.post("auth/change-password", { json: data }).json();
  },
  getProfile: async () => {
    return api.get("auth/profile").json();
  }
};
const dashboardApi = {
  getDashboard: async () => {
    return api.get("dashboard").json();
  },
  getMetrics: async () => {
    return api.get("dashboard/metrics").json();
  },
  getRecentActivity: async () => {
    return api.get("dashboard/activity").json();
  }
};
const apiKeysApi = {
  list: async () => {
    const response = await api.get("auth/tokens").json();
    return response.data;
  },
  create: async (data) => {
    const response = await api.post("auth/tokens", { json: data }).json();
    return response.data;
  },
  revoke: async (tokenId) => {
    return api.delete(`auth/tokens/${tokenId}`).json();
  }
};
const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};
const getStoredToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
};
const isAuthenticated = () => {
  if (typeof window === "undefined") return false;
  return !!getStoredToken();
};
const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3, current: true },
  { name: "Websites", href: "/websites", icon: Package },
  { name: "Customizations", href: "/customizations", icon: Settings }
];
const otherItems = [
  { name: "Documentation", href: "/docs", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: PieChart },
  { name: "API Keys", href: "/api-keys", icon: Key }
];
const accountItems = [
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings }
];
function Sidebar({ isOpen = false, onClose }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userData = getStoredUser();
    if (userData) {
      setUser(userData);
    }
  }, []);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    isOpen && /* @__PURE__ */ jsx(
      "div",
      {
        className: "lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-in-out",
        onClick: onClose,
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsx(
      "div",
      {
        className: cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:inset-0 flex-shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        ),
        children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between h-16 px-4 border-b border-gray-200", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
              /* @__PURE__ */ jsx("div", { className: "w-8 h-8 bg-blue-600 rounded flex items-center justify-center", children: /* @__PURE__ */ jsx(ChevronLeft, { className: "w-4 h-4 text-white" }) }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { className: "font-semibold text-sm", children: "Kuttl Inc." }),
                /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-500", children: "Free Plan" })
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "lg:hidden p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500",
                onClick: onClose,
                "aria-label": "Close navigation menu",
                children: /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col overflow-y-auto px-4 py-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
              /* @__PURE__ */ jsx("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3", children: "MAIN MENU" }),
              /* @__PURE__ */ jsx("nav", { className: "space-y-1", children: navigation.map((item) => /* @__PURE__ */ jsxs(
                "a",
                {
                  href: item.href,
                  className: cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    item.current ? "bg-blue-50 text-blue-600 border-blue-500" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  ),
                  children: [
                    /* @__PURE__ */ jsx(item.icon, { className: "mr-3 h-5 w-5 flex-shrink-0" }),
                    /* @__PURE__ */ jsx("span", { className: "flex-1", children: item.name }),
                    item.badge && /* @__PURE__ */ jsx("span", { className: "ml-3 inline-block py-0.5 px-2 text-xs font-medium bg-gray-200 text-gray-800 rounded-full", children: item.badge })
                  ]
                },
                item.name
              )) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
              /* @__PURE__ */ jsx("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3", children: "OTHER" }),
              /* @__PURE__ */ jsx("nav", { className: "space-y-1", children: otherItems.map((item) => /* @__PURE__ */ jsxs(
                "a",
                {
                  href: item.href,
                  className: "group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors",
                  children: [
                    /* @__PURE__ */ jsx(item.icon, { className: "mr-3 h-5 w-5 flex-shrink-0" }),
                    item.name
                  ]
                },
                item.name
              )) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h3", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3", children: "ACCOUNT" }),
              /* @__PURE__ */ jsx("nav", { className: "space-y-1", children: accountItems.map((item) => /* @__PURE__ */ jsxs(
                "a",
                {
                  href: item.href,
                  className: "group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors",
                  children: [
                    /* @__PURE__ */ jsx(item.icon, { className: "mr-3 h-5 w-5 flex-shrink-0" }),
                    item.name
                  ]
                },
                item.name
              )) })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex-shrink-0 border-t border-gray-200 p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
            /* @__PURE__ */ jsx("div", { className: "flex-shrink-0", children: /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium", children: user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U" }) }),
            /* @__PURE__ */ jsx("div", { className: "ml-3 flex-1 min-w-0", children: /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-900 truncate", children: user?.name || "User" }) })
          ] }) })
        ] })
      }
    )
  ] });
}
function DashboardHeader({ onMenuClick }) {
  return /* @__PURE__ */ jsx("div", { className: "flex justify-end justify-between flex-wrap gap-4", children: /* @__PURE__ */ jsx("div", { className: "flex items-center space-x-2 lg:space-x-4", children: /* @__PURE__ */ jsxs("button", { className: "relative p-2 text-gray-400 hover:text-gray-500", children: [
    /* @__PURE__ */ jsx(Bell, { className: "h-6 w-6" }),
    /* @__PURE__ */ jsx("span", { className: "absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" })
  ] }) }) });
}
function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen]);
  const handleMenuClick = () => {
    console.log("Menu clicked, current state:", sidebarOpen);
    setSidebarOpen(!sidebarOpen);
  };
  return /* @__PURE__ */ jsxs("div", { className: "h-screen flex overflow-hidden bg-gray-50", children: [
    /* @__PURE__ */ jsx(Sidebar, { isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-4 p-4 md:p-6 lg:p-8 pt-4 md:pt-6", children: [
      /* @__PURE__ */ jsx(DashboardHeader, { onMenuClick: handleMenuClick }),
      children
    ] }) })
  ] });
}
function MetricsGrid() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await dashboardApi.getMetrics();
        setMetrics(data);
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);
  const formatNumber = (num) => {
    if (num >= 1e6) {
      return (num / 1e6).toFixed(1) + "M";
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(1) + "K";
    }
    return num.toLocaleString();
  };
  const calculateChange = (current, monthly) => {
    if (current === 0) return "+0%";
    const percentage = monthly / Math.max(current - monthly, 1) * 100;
    return `+${percentage.toFixed(0)}%`;
  };
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm animate-pulse", children: [
      /* @__PURE__ */ jsx("div", { className: "h-4 bg-gray-200 rounded w-1/2 mb-4" }),
      /* @__PURE__ */ jsx("div", { className: "h-8 bg-gray-200 rounded w-1/3 mb-2" }),
      /* @__PURE__ */ jsx("div", { className: "h-3 bg-gray-200 rounded w-1/4" })
    ] }, i)) });
  }
  if (!metrics) {
    return /* @__PURE__ */ jsx("div", { className: "bg-white p-8 rounded-lg border border-gray-200 shadow-sm text-center", children: /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: "Failed to load metrics" }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm md:col-span-2 xl:col-span-1", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Total Websites" }),
        /* @__PURE__ */ jsx("select", { className: "text-xs bg-transparent border-none text-gray-500 focus:outline-none", children: /* @__PURE__ */ jsx("option", { children: "This month" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold text-gray-900", children: formatNumber(metrics.total_websites) }),
        /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-500", children: "Tracked websites" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-600 mb-2", children: [
          "Total snapshots: ",
          formatNumber(metrics.total_snapshots)
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-500 mb-2", children: [
          "This month: ",
          formatNumber(metrics.snapshots_this_month)
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: /* @__PURE__ */ jsx("span", { className: "px-3 py-1 bg-blue-500 text-white text-xs rounded-full", children: "Active" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm", children: [
      /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between mb-4", children: /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-500", children: "API Requests" }) }),
      /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold text-gray-900", children: formatNumber(metrics.total_api_requests) }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center text-sm text-gray-500", children: [
          /* @__PURE__ */ jsx("span", { children: "vs last month" }),
          /* @__PURE__ */ jsxs("span", { className: "ml-2 text-green-500 flex items-center", children: [
            /* @__PURE__ */ jsx(TrendingUp, { className: "w-3 h-3 mr-1" }),
            calculateChange(metrics.total_api_requests, metrics.api_requests_this_month)
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "h-12 flex items-end space-x-1", children: [...Array(12)].map((_, i) => /* @__PURE__ */ jsx(
        "div",
        {
          className: cn(
            "flex-1 bg-blue-500 rounded-sm",
            i === 6 ? "h-8" : i === 7 ? "h-10" : i === 8 ? "h-12" : "h-4"
          )
        },
        i
      )) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 text-sm text-gray-500", children: [
        "This month: ",
        formatNumber(metrics.api_requests_this_month)
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm", children: [
      /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between mb-4", children: /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-500", children: "UI Customizations" }) }),
      /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold text-gray-900", children: formatNumber(metrics.total_customizations) }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center text-sm text-gray-500", children: [
          /* @__PURE__ */ jsx("span", { children: "vs last month" }),
          /* @__PURE__ */ jsxs("span", { className: "ml-2 text-green-500 flex items-center", children: [
            /* @__PURE__ */ jsx(TrendingUp, { className: "w-3 h-3 mr-1" }),
            calculateChange(metrics.total_customizations, metrics.customizations_this_month)
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative w-16 h-16 mx-auto mb-4", children: [
        /* @__PURE__ */ jsxs("svg", { className: "w-16 h-16 transform -rotate-90", viewBox: "0 0 36 36", children: [
          /* @__PURE__ */ jsx(
            "path",
            {
              d: "M18 2.0845 A 15.9155 15.9155 0 0 1 18 33.9155",
              fill: "none",
              stroke: "#e5e7eb",
              strokeWidth: "2"
            }
          ),
          /* @__PURE__ */ jsx(
            "path",
            {
              d: "M18 2.0845 A 15.9155 15.9155 0 0 1 18 33.9155",
              fill: "none",
              stroke: "#3b82f6",
              strokeWidth: "2",
              strokeDasharray: `${Math.min(metrics.customizations_this_month / Math.max(metrics.total_customizations, 1) * 100, 100)}, 100`
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: /* @__PURE__ */ jsxs("span", { className: "text-lg font-bold text-gray-900", children: [
          Math.min(metrics.customizations_this_month / Math.max(metrics.total_customizations, 1) * 100, 100).toFixed(0),
          "%"
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 text-sm text-gray-500", children: [
        "This month: ",
        formatNumber(metrics.customizations_this_month)
      ] })
    ] })
  ] });
}
const analyticsData = [
  { name: "JAN", value: 12.5, requests: 45e3 },
  { name: "FEB", value: 15.2, requests: 52e3 },
  { name: "MAR", value: 18.8, requests: 64e3 },
  { name: "APR", value: 22.1, requests: 78e3 },
  { name: "MAY", value: 28.2, requests: 95e3 },
  { name: "JUN", value: 31.8, requests: 11e4 },
  { name: "JUL", value: 35.5, requests: 125e3 },
  { name: "AUG", value: 42.3, requests: 145e3 }
];
const usageData$1 = [
  { name: "Active Usage", value: 73.2, color: "#3b82f6" },
  { name: "Idle", value: 26.8, color: "#e5e7eb" }
];
function ChartsSection() {
  return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-6", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-500 mb-2", children: "API Usage Growth" }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-baseline space-x-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-2xl font-bold text-gray-900", children: "+42.3%" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm text-gray-500", children: "Growth" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm text-green-500", children: "+12.8%" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
          /* @__PURE__ */ jsx("select", { className: "text-xs bg-transparent border-none text-gray-500 focus:outline-none", children: /* @__PURE__ */ jsx("option", { children: "This year" }) }),
          /* @__PURE__ */ jsx("button", { className: "p-2 hover:bg-gray-100 rounded", children: /* @__PURE__ */ jsx(Filter, { className: "w-4 h-4 text-gray-500" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "h-48 lg:h-64", children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(AreaChart, { data: analyticsData, children: [
        /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: "colorValue", x1: "0", y1: "0", x2: "0", y2: "1", children: [
          /* @__PURE__ */ jsx("stop", { offset: "5%", stopColor: "#3b82f6", stopOpacity: 0.8 }),
          /* @__PURE__ */ jsx("stop", { offset: "95%", stopColor: "#3b82f6", stopOpacity: 0.1 })
        ] }) }),
        /* @__PURE__ */ jsx(
          XAxis,
          {
            dataKey: "name",
            axisLine: false,
            tickLine: false,
            tick: { fontSize: 12, fill: "#6b7280" }
          }
        ),
        /* @__PURE__ */ jsx(
          YAxis,
          {
            axisLine: false,
            tickLine: false,
            tick: { fontSize: 12, fill: "#6b7280" }
          }
        ),
        /* @__PURE__ */ jsx(
          Area,
          {
            type: "monotone",
            dataKey: "value",
            stroke: "#3b82f6",
            fillOpacity: 1,
            fill: "url(#colorValue)",
            strokeWidth: 2
          }
        )
      ] }) }) }),
      /* @__PURE__ */ jsx("div", { className: "mt-4 text-center", children: /* @__PURE__ */ jsx("div", { className: "text-sm text-green-500", children: "+28%" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm", children: [
      /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between mb-6", children: /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-500", children: "Platform Performance" }) }),
      /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold text-gray-900", children: "73.2%" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-500", children: "Active usage" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "h-24 lg:h-32 mb-4", children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsx(PieChart$1, { children: /* @__PURE__ */ jsx(
        Pie,
        {
          data: usageData$1,
          cx: "50%",
          cy: "50%",
          innerRadius: 40,
          outerRadius: 60,
          startAngle: 90,
          endAngle: 450,
          dataKey: "value",
          stroke: "none",
          children: usageData$1.map((entry2, index) => /* @__PURE__ */ jsx(Cell, { fill: entry2.color }, `cell-${index}`))
        }
      ) }) }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
            /* @__PURE__ */ jsx("div", { className: "w-3 h-3 bg-blue-500 rounded mr-2" }),
            /* @__PURE__ */ jsx("span", { className: "text-gray-600", children: "Active API usage" })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "font-medium text-gray-900", children: "Daily average" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
            /* @__PURE__ */ jsx("div", { className: "w-3 h-3 bg-gray-300 rounded mr-2" }),
            /* @__PURE__ */ jsx("span", { className: "text-gray-600", children: "Idle time" })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "font-medium text-gray-900", children: "Per account" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center", children: "See Details →" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-6", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-500", children: "UI Customizations by Plan" }),
          /* @__PURE__ */ jsxs("div", { className: "mt-2", children: [
            /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold text-gray-900", children: "3,456" }),
            /* @__PURE__ */ jsx("div", { className: "text-sm text-green-500", children: "+18%" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "text-gray-400 hover:text-gray-600", children: "⋯" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs text-gray-500", children: [
          /* @__PURE__ */ jsx("span", { children: "Premium" }),
          /* @__PURE__ */ jsx("span", { children: "2,340 customizations" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: /* @__PURE__ */ jsx("div", { className: "bg-blue-500 h-2 rounded-full", style: { width: "68%" } }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 space-y-2", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between text-xs text-gray-500", children: /* @__PURE__ */ jsx("span", { children: "Free" }) }),
        /* @__PURE__ */ jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: /* @__PURE__ */ jsx("div", { className: "bg-blue-400 h-2 rounded-full", style: { width: "32%" } }) })
      ] })
    ] })
  ] });
}
function DataTable() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await dashboardApi.getRecentActivity();
        setActivities(data);
      } catch (error) {
        console.error("Failed to fetch recent activity:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-lg border border-gray-200 shadow-sm", children: [
      /* @__PURE__ */ jsx("div", { className: "p-4 lg:p-6 border-b border-gray-200", children: /* @__PURE__ */ jsx("div", { className: "h-6 bg-gray-200 rounded w-1/4 animate-pulse" }) }),
      /* @__PURE__ */ jsx("div", { className: "p-4", children: /* @__PURE__ */ jsx("div", { className: "animate-pulse space-y-4", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxs("div", { className: "flex space-x-4", children: [
        /* @__PURE__ */ jsx("div", { className: "h-4 bg-gray-200 rounded w-1/4" }),
        /* @__PURE__ */ jsx("div", { className: "h-4 bg-gray-200 rounded w-1/4" }),
        /* @__PURE__ */ jsx("div", { className: "h-4 bg-gray-200 rounded w-1/4" }),
        /* @__PURE__ */ jsx("div", { className: "h-4 bg-gray-200 rounded w-1/4" })
      ] }, i)) }) })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-lg border border-gray-200 shadow-sm", children: [
    /* @__PURE__ */ jsx("div", { className: "p-4 lg:p-6 border-b border-gray-200", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Recent Activity" }),
      /* @__PURE__ */ jsx("button", { className: "text-sm text-gray-500 hover:text-gray-700 flex items-center", children: "View All →" })
    ] }) }),
    activities.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "p-8 text-center text-gray-500", children: [
      /* @__PURE__ */ jsx("p", { children: "No recent activity found." }),
      /* @__PURE__ */ jsx("p", { className: "text-sm mt-1", children: "Activity will appear here once you start taking snapshots." })
    ] }) : /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-gray-50", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "🌐 Website ID" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Snapshot Date" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Components" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Customizations" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: activities.map((activity, index) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-gray-50", children: [
        /* @__PURE__ */ jsx("td", { className: "px-4 lg:px-6 py-4 whitespace-nowrap", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
          /* @__PURE__ */ jsx("div", { className: "flex-shrink-0 h-8 w-8", children: /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium", children: activity.website_id.charAt(0).toUpperCase() }) }),
          /* @__PURE__ */ jsx("div", { className: "ml-3", children: /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-900", children: activity.website_id.length > 20 ? activity.website_id.substring(0, 20) + "..." : activity.website_id }) })
        ] }) }),
        /* @__PURE__ */ jsx("td", { className: "px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: formatDate(activity.snapshot_created_at) }),
        /* @__PURE__ */ jsx("td", { className: "px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: activity.component_count.toLocaleString() }),
        /* @__PURE__ */ jsx("td", { className: "px-4 lg:px-6 py-4 whitespace-nowrap", children: /* @__PURE__ */ jsx("span", { className: "inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800", children: activity.customization_count }) })
      ] }, index)) })
    ] }) })
  ] });
}
function AuthWrapper({ children }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
      return;
    }
    const user = getStoredUser();
    if (user && !user.verified) {
      console.warn("User email not verified");
    }
  }, [navigate]);
  if (!isAuthenticated()) {
    return null;
  }
  return /* @__PURE__ */ jsx(Fragment, { children });
}
const home = UNSAFE_withComponentProps(function Home() {
  return /* @__PURE__ */ jsx(AuthWrapper, {
    children: /* @__PURE__ */ jsxs(DashboardLayout, {
      children: [/* @__PURE__ */ jsx(MetricsGrid, {}), /* @__PURE__ */ jsx(ChartsSection, {}), /* @__PURE__ */ jsx(DataTable, {})]
    })
  });
});
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: home
}, Symbol.toStringTag, { value: "Module" }));
const accounts = [{
  id: 1,
  name: "Acme Corp",
  email: "admin@acmecorp.com",
  plan: "Premium",
  status: "Active",
  apiCalls: "12,450",
  lastActive: "2 hours ago",
  created: "2024-01-15"
}, {
  id: 2,
  name: "TechStart Inc",
  email: "dev@techstart.io",
  plan: "Free",
  status: "Active",
  apiCalls: "3,240",
  lastActive: "1 day ago",
  created: "2024-02-20"
}, {
  id: 3,
  name: "Design Studio",
  email: "hello@designstudio.com",
  plan: "Free",
  status: "Inactive",
  apiCalls: "890",
  lastActive: "1 week ago",
  created: "2024-03-10"
}, {
  id: 4,
  name: "BuildCo Ltd",
  email: "team@buildco.com",
  plan: "Premium",
  status: "Active",
  apiCalls: "8,750",
  lastActive: "5 minutes ago",
  created: "2024-01-28"
}, {
  id: 5,
  name: "StartupXYZ",
  email: "founders@startupxyz.com",
  plan: "Free",
  status: "Active",
  apiCalls: "1,234",
  lastActive: "3 hours ago",
  created: "2024-04-05"
}];
const accounts_default = UNSAFE_withComponentProps(function Accounts() {
  return /* @__PURE__ */ jsx(DashboardLayout, {
    children: /* @__PURE__ */ jsxs("div", {
      className: "space-y-6",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("h1", {
            className: "text-2xl font-bold text-gray-900",
            children: "Accounts"
          }), /* @__PURE__ */ jsx("p", {
            className: "text-sm text-gray-500",
            children: "Manage user accounts and their access levels"
          })]
        }), /* @__PURE__ */ jsxs("button", {
          className: "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2",
          children: [/* @__PURE__ */ jsx(Plus, {
            className: "w-4 h-4"
          }), /* @__PURE__ */ jsx("span", {
            children: "Add Account"
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex items-center space-x-4",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "relative flex-1 max-w-md",
          children: [/* @__PURE__ */ jsx(Search, {
            className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
          }), /* @__PURE__ */ jsx("input", {
            type: "text",
            placeholder: "Search accounts...",
            className: "pl-10 pr-4 py-2 w-full bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          })]
        }), /* @__PURE__ */ jsxs("button", {
          className: "flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50",
          children: [/* @__PURE__ */ jsx(Filter, {
            className: "w-4 h-4"
          }), /* @__PURE__ */ jsx("span", {
            children: "Filter"
          })]
        })]
      }), /* @__PURE__ */ jsx("div", {
        className: "bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden",
        children: /* @__PURE__ */ jsx("div", {
          className: "overflow-x-auto",
          children: /* @__PURE__ */ jsxs("table", {
            className: "min-w-full divide-y divide-gray-200",
            children: [/* @__PURE__ */ jsx("thead", {
              className: "bg-gray-50",
              children: /* @__PURE__ */ jsxs("tr", {
                children: [/* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Account"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Plan"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "API Calls"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Last Active"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Status"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Actions"
                })]
              })
            }), /* @__PURE__ */ jsx("tbody", {
              className: "bg-white divide-y divide-gray-200",
              children: accounts.map((account) => /* @__PURE__ */ jsxs("tr", {
                className: "hover:bg-gray-50",
                children: [/* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap",
                  children: /* @__PURE__ */ jsxs("div", {
                    className: "flex items-center",
                    children: [/* @__PURE__ */ jsx("div", {
                      className: "w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0",
                      children: /* @__PURE__ */ jsx("span", {
                        className: "text-sm font-medium text-blue-600",
                        children: account.name.charAt(0)
                      })
                    }), /* @__PURE__ */ jsxs("div", {
                      children: [/* @__PURE__ */ jsx("div", {
                        className: "text-sm font-medium text-gray-900",
                        children: account.name
                      }), /* @__PURE__ */ jsx("div", {
                        className: "text-sm text-gray-500",
                        children: account.email
                      })]
                    })]
                  })
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap",
                  children: /* @__PURE__ */ jsx("span", {
                    className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${account.plan === "Premium" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"}`,
                    children: account.plan
                  })
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                  children: account.apiCalls
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500",
                  children: account.lastActive
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap",
                  children: /* @__PURE__ */ jsx("span", {
                    className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${account.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`,
                    children: account.status
                  })
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium",
                  children: /* @__PURE__ */ jsx("button", {
                    className: "text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100",
                    children: /* @__PURE__ */ jsx(MoreVertical, {
                      className: "w-4 h-4"
                    })
                  })
                })]
              }, account.id))
            })]
          })
        })
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsx("div", {
          className: "text-sm text-gray-500",
          children: "Showing 1 to 5 of 5 accounts"
        }), /* @__PURE__ */ jsxs("div", {
          className: "flex items-center space-x-2",
          children: [/* @__PURE__ */ jsx("button", {
            className: "px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50",
            children: "Previous"
          }), /* @__PURE__ */ jsx("button", {
            className: "px-3 py-2 text-sm font-medium text-white bg-blue-500 border border-blue-500 rounded-md",
            children: "1"
          }), /* @__PURE__ */ jsx("button", {
            className: "px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50",
            children: "Next"
          })]
        })]
      })]
    })
  });
});
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: accounts_default
}, Symbol.toStringTag, { value: "Module" }));
const uiLayers = [{
  id: 1,
  name: "Header Component",
  description: "Navigation header with logo and menu items",
  version: "v2.1.0",
  type: "Component",
  status: "Active",
  usageCount: 234,
  lastModified: "2 days ago",
  account: "Acme Corp"
}, {
  id: 2,
  name: "Dark Theme",
  description: "Complete dark mode styling for all components",
  version: "v1.5.2",
  type: "Theme",
  status: "Active",
  usageCount: 156,
  lastModified: "1 week ago",
  account: "TechStart Inc"
}, {
  id: 3,
  name: "Button Variants",
  description: "Custom button styles with hover animations",
  version: "v3.0.1",
  type: "Component",
  status: "Draft",
  usageCount: 89,
  lastModified: "3 hours ago",
  account: "Design Studio"
}, {
  id: 4,
  name: "Mobile Layout",
  description: "Responsive layout adjustments for mobile devices",
  version: "v1.8.0",
  type: "Layout",
  status: "Active",
  usageCount: 312,
  lastModified: "5 days ago",
  account: "BuildCo Ltd"
}, {
  id: 5,
  name: "Form Elements",
  description: "Styled input fields, checkboxes, and form controls",
  version: "v2.3.1",
  type: "Component",
  status: "Active",
  usageCount: 167,
  lastModified: "1 day ago",
  account: "StartupXYZ"
}];
const typeColors = {
  Component: "bg-blue-100 text-blue-800",
  Theme: "bg-purple-100 text-purple-800",
  Layout: "bg-green-100 text-green-800"
};
const uiLayers_default = UNSAFE_withComponentProps(function UILayers() {
  return /* @__PURE__ */ jsx(DashboardLayout, {
    children: /* @__PURE__ */ jsxs("div", {
      className: "space-y-6",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("h1", {
            className: "text-2xl font-bold text-gray-900",
            children: "UI Layers"
          }), /* @__PURE__ */ jsx("p", {
            className: "text-sm text-gray-500",
            children: "Manage reusable UI components and themes"
          })]
        }), /* @__PURE__ */ jsxs("button", {
          className: "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2",
          children: [/* @__PURE__ */ jsx(Plus, {
            className: "w-4 h-4"
          }), /* @__PURE__ */ jsx("span", {
            children: "Create Layer"
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "grid grid-cols-1 md:grid-cols-4 gap-4",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "bg-white p-4 rounded-lg border border-gray-200",
          children: [/* @__PURE__ */ jsx("div", {
            className: "text-2xl font-bold text-gray-900",
            children: "28"
          }), /* @__PURE__ */ jsx("div", {
            className: "text-sm text-gray-500",
            children: "Total Layers"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "bg-white p-4 rounded-lg border border-gray-200",
          children: [/* @__PURE__ */ jsx("div", {
            className: "text-2xl font-bold text-gray-900",
            children: "958"
          }), /* @__PURE__ */ jsx("div", {
            className: "text-sm text-gray-500",
            children: "Total Usage"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "bg-white p-4 rounded-lg border border-gray-200",
          children: [/* @__PURE__ */ jsx("div", {
            className: "text-2xl font-bold text-gray-900",
            children: "12"
          }), /* @__PURE__ */ jsx("div", {
            className: "text-sm text-gray-500",
            children: "Components"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "bg-white p-4 rounded-lg border border-gray-200",
          children: [/* @__PURE__ */ jsx("div", {
            className: "text-2xl font-bold text-gray-900",
            children: "8"
          }), /* @__PURE__ */ jsx("div", {
            className: "text-sm text-gray-500",
            children: "Themes"
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex items-center space-x-4",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "relative flex-1 max-w-md",
          children: [/* @__PURE__ */ jsx(Search, {
            className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
          }), /* @__PURE__ */ jsx("input", {
            type: "text",
            placeholder: "Search UI layers...",
            className: "pl-10 pr-4 py-2 w-full bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          })]
        }), /* @__PURE__ */ jsxs("select", {
          className: "px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500",
          children: [/* @__PURE__ */ jsx("option", {
            children: "All Types"
          }), /* @__PURE__ */ jsx("option", {
            children: "Component"
          }), /* @__PURE__ */ jsx("option", {
            children: "Theme"
          }), /* @__PURE__ */ jsx("option", {
            children: "Layout"
          })]
        }), /* @__PURE__ */ jsxs("button", {
          className: "flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50",
          children: [/* @__PURE__ */ jsx(Filter, {
            className: "w-4 h-4"
          }), /* @__PURE__ */ jsx("span", {
            children: "Filter"
          })]
        })]
      }), /* @__PURE__ */ jsx("div", {
        className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        children: uiLayers.map((layer) => /* @__PURE__ */ jsx("div", {
          className: "bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow",
          children: /* @__PURE__ */ jsxs("div", {
            className: "p-6",
            children: [/* @__PURE__ */ jsxs("div", {
              className: "flex items-start justify-between mb-4",
              children: [/* @__PURE__ */ jsxs("div", {
                className: "flex-1",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex items-center space-x-2 mb-2",
                  children: [/* @__PURE__ */ jsx("h3", {
                    className: "text-lg font-semibold text-gray-900",
                    children: layer.name
                  }), /* @__PURE__ */ jsx("span", {
                    className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeColors[layer.type] || "bg-gray-100 text-gray-800"}`,
                    children: layer.type
                  })]
                }), /* @__PURE__ */ jsx("p", {
                  className: "text-sm text-gray-500 mb-2",
                  children: layer.description
                }), /* @__PURE__ */ jsxs("div", {
                  className: "text-xs text-gray-400",
                  children: ["Version ", layer.version, " • ", layer.account]
                })]
              }), /* @__PURE__ */ jsx("button", {
                className: "text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100",
                children: /* @__PURE__ */ jsx(MoreVertical, {
                  className: "w-4 h-4"
                })
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "flex items-center justify-between mb-4",
              children: [/* @__PURE__ */ jsxs("div", {
                className: "flex items-center space-x-4 text-sm text-gray-500",
                children: [/* @__PURE__ */ jsxs("span", {
                  children: [layer.usageCount, " uses"]
                }), /* @__PURE__ */ jsx("span", {
                  children: "•"
                }), /* @__PURE__ */ jsx("span", {
                  children: layer.lastModified
                })]
              }), /* @__PURE__ */ jsx("span", {
                className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${layer.status === "Active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`,
                children: layer.status
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "flex items-center space-x-2",
              children: [/* @__PURE__ */ jsxs("button", {
                className: "flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200",
                children: [/* @__PURE__ */ jsx(Eye, {
                  className: "w-4 h-4"
                }), /* @__PURE__ */ jsx("span", {
                  children: "Preview"
                })]
              }), /* @__PURE__ */ jsx("button", {
                className: "flex items-center justify-center p-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200",
                children: /* @__PURE__ */ jsx(Code, {
                  className: "w-4 h-4"
                })
              }), /* @__PURE__ */ jsx("button", {
                className: "flex items-center justify-center p-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200",
                children: /* @__PURE__ */ jsx(Download, {
                  className: "w-4 h-4"
                })
              })]
            })]
          })
        }, layer.id))
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsx("div", {
          className: "text-sm text-gray-500",
          children: "Showing 1 to 5 of 28 UI layers"
        }), /* @__PURE__ */ jsxs("div", {
          className: "flex items-center space-x-2",
          children: [/* @__PURE__ */ jsx("button", {
            className: "px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50",
            children: "Previous"
          }), /* @__PURE__ */ jsx("button", {
            className: "px-3 py-2 text-sm font-medium text-white bg-blue-500 border border-blue-500 rounded-md",
            children: "1"
          }), /* @__PURE__ */ jsx("button", {
            className: "px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50",
            children: "2"
          }), /* @__PURE__ */ jsx("button", {
            className: "px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50",
            children: "Next"
          })]
        })]
      })]
    })
  });
});
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: uiLayers_default
}, Symbol.toStringTag, { value: "Module" }));
const customizations = [{
  id: 1,
  name: "E-commerce Header",
  description: "Custom header with shopping cart integration",
  account: "Acme Corp",
  layer: "Header Component",
  status: "Live",
  requests: "2,341",
  lastUsed: "5 minutes ago",
  created: "2024-04-10",
  performance: "98.5%"
}, {
  id: 2,
  name: "Dark Mode Blog",
  description: "Blog layout with dark theme customizations",
  account: "TechStart Inc",
  layer: "Dark Theme",
  status: "Live",
  requests: "1,876",
  lastUsed: "2 hours ago",
  created: "2024-03-22",
  performance: "97.2%"
}, {
  id: 3,
  name: "Mobile Dashboard",
  description: "Responsive dashboard for mobile app",
  account: "BuildCo Ltd",
  layer: "Mobile Layout",
  status: "Testing",
  requests: "156",
  lastUsed: "1 day ago",
  created: "2024-04-15",
  performance: "94.8%"
}, {
  id: 4,
  name: "Contact Form Styling",
  description: "Branded contact form with validation",
  account: "Design Studio",
  layer: "Form Elements",
  status: "Draft",
  requests: "0",
  lastUsed: "Never",
  created: "2024-04-18",
  performance: "-"
}, {
  id: 5,
  name: "Premium Button Set",
  description: "Animated buttons for premium features",
  account: "StartupXYZ",
  layer: "Button Variants",
  status: "Live",
  requests: "3,102",
  lastUsed: "30 minutes ago",
  created: "2024-02-28",
  performance: "99.1%"
}];
const statusColors = {
  Live: "bg-green-100 text-green-800",
  Testing: "bg-yellow-100 text-yellow-800",
  Draft: "bg-gray-100 text-gray-800"
};
const customizations_default = UNSAFE_withComponentProps(function Customizations() {
  return /* @__PURE__ */ jsx(DashboardLayout, {
    children: /* @__PURE__ */ jsxs("div", {
      className: "space-y-6",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("h1", {
            className: "text-2xl font-bold text-gray-900",
            children: "Customizations"
          }), /* @__PURE__ */ jsx("p", {
            className: "text-sm text-gray-500",
            children: "Monitor active UI customizations and their performance"
          })]
        }), /* @__PURE__ */ jsxs("button", {
          className: "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2",
          children: [/* @__PURE__ */ jsx(Plus, {
            className: "w-4 h-4"
          }), /* @__PURE__ */ jsx("span", {
            children: "New Customization"
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "grid grid-cols-1 md:grid-cols-4 gap-4",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "bg-white p-4 rounded-lg border border-gray-200",
          children: [/* @__PURE__ */ jsx("div", {
            className: "text-2xl font-bold text-gray-900",
            children: "42"
          }), /* @__PURE__ */ jsx("div", {
            className: "text-sm text-gray-500",
            children: "Active Customizations"
          }), /* @__PURE__ */ jsx("div", {
            className: "text-xs text-green-500 mt-1",
            children: "+8 this week"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "bg-white p-4 rounded-lg border border-gray-200",
          children: [/* @__PURE__ */ jsx("div", {
            className: "text-2xl font-bold text-gray-900",
            children: "847K"
          }), /* @__PURE__ */ jsx("div", {
            className: "text-sm text-gray-500",
            children: "Total Requests"
          }), /* @__PURE__ */ jsx("div", {
            className: "text-xs text-green-500 mt-1",
            children: "+12% vs last month"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "bg-white p-4 rounded-lg border border-gray-200",
          children: [/* @__PURE__ */ jsx("div", {
            className: "text-2xl font-bold text-gray-900",
            children: "97.8%"
          }), /* @__PURE__ */ jsx("div", {
            className: "text-sm text-gray-500",
            children: "Avg Performance"
          }), /* @__PURE__ */ jsx("div", {
            className: "text-xs text-green-500 mt-1",
            children: "+0.3% improvement"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "bg-white p-4 rounded-lg border border-gray-200",
          children: [/* @__PURE__ */ jsx("div", {
            className: "text-2xl font-bold text-gray-900",
            children: "156ms"
          }), /* @__PURE__ */ jsx("div", {
            className: "text-sm text-gray-500",
            children: "Avg Response Time"
          }), /* @__PURE__ */ jsx("div", {
            className: "text-xs text-green-500 mt-1",
            children: "-12ms faster"
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex items-center space-x-4",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "relative flex-1 max-w-md",
          children: [/* @__PURE__ */ jsx(Search, {
            className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
          }), /* @__PURE__ */ jsx("input", {
            type: "text",
            placeholder: "Search customizations...",
            className: "pl-10 pr-4 py-2 w-full bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          })]
        }), /* @__PURE__ */ jsxs("select", {
          className: "px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500",
          children: [/* @__PURE__ */ jsx("option", {
            children: "All Status"
          }), /* @__PURE__ */ jsx("option", {
            children: "Live"
          }), /* @__PURE__ */ jsx("option", {
            children: "Testing"
          }), /* @__PURE__ */ jsx("option", {
            children: "Draft"
          })]
        }), /* @__PURE__ */ jsxs("button", {
          className: "flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50",
          children: [/* @__PURE__ */ jsx(Filter, {
            className: "w-4 h-4"
          }), /* @__PURE__ */ jsx("span", {
            children: "Filter"
          })]
        })]
      }), /* @__PURE__ */ jsx("div", {
        className: "bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden",
        children: /* @__PURE__ */ jsx("div", {
          className: "overflow-x-auto",
          children: /* @__PURE__ */ jsxs("table", {
            className: "min-w-full divide-y divide-gray-200",
            children: [/* @__PURE__ */ jsx("thead", {
              className: "bg-gray-50",
              children: /* @__PURE__ */ jsxs("tr", {
                children: [/* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Customization"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Account"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Status"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Requests"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Performance"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Last Used"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Actions"
                })]
              })
            }), /* @__PURE__ */ jsx("tbody", {
              className: "bg-white divide-y divide-gray-200",
              children: customizations.map((custom) => /* @__PURE__ */ jsxs("tr", {
                className: "hover:bg-gray-50",
                children: [/* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap",
                  children: /* @__PURE__ */ jsxs("div", {
                    className: "flex items-center",
                    children: [/* @__PURE__ */ jsx("div", {
                      className: "w-10 h-10 bg-blue-100 rounded flex items-center justify-center mr-4 flex-shrink-0",
                      children: /* @__PURE__ */ jsx(Settings, {
                        className: "w-5 h-5 text-blue-600"
                      })
                    }), /* @__PURE__ */ jsxs("div", {
                      children: [/* @__PURE__ */ jsx("div", {
                        className: "text-sm font-medium text-gray-900",
                        children: custom.name
                      }), /* @__PURE__ */ jsx("div", {
                        className: "text-sm text-gray-500",
                        children: custom.description
                      }), /* @__PURE__ */ jsxs("div", {
                        className: "text-xs text-gray-400",
                        children: ["Based on: ", custom.layer]
                      })]
                    })]
                  })
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                  children: custom.account
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap",
                  children: /* @__PURE__ */ jsx("span", {
                    className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[custom.status]}`,
                    children: custom.status
                  })
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                  children: custom.requests
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap",
                  children: /* @__PURE__ */ jsx("div", {
                    className: "flex items-center",
                    children: /* @__PURE__ */ jsx("span", {
                      className: `text-sm font-medium ${custom.performance === "-" ? "text-gray-400" : parseFloat(custom.performance) >= 98 ? "text-green-600" : parseFloat(custom.performance) >= 95 ? "text-yellow-600" : "text-red-600"}`,
                      children: custom.performance
                    })
                  })
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500",
                  children: custom.lastUsed
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap text-right",
                  children: /* @__PURE__ */ jsxs("div", {
                    className: "flex items-center space-x-2",
                    children: [/* @__PURE__ */ jsx("button", {
                      className: "text-gray-400 hover:text-blue-600 p-1 rounded-md hover:bg-gray-100",
                      children: /* @__PURE__ */ jsx(Eye, {
                        className: "w-4 h-4"
                      })
                    }), /* @__PURE__ */ jsx("button", {
                      className: "text-gray-400 hover:text-blue-600 p-1 rounded-md hover:bg-gray-100",
                      children: /* @__PURE__ */ jsx(Copy, {
                        className: "w-4 h-4"
                      })
                    }), /* @__PURE__ */ jsx("button", {
                      className: "text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100",
                      children: /* @__PURE__ */ jsx(MoreVertical, {
                        className: "w-4 h-4"
                      })
                    })]
                  })
                })]
              }, custom.id))
            })]
          })
        })
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsx("div", {
          className: "text-sm text-gray-500",
          children: "Showing 1 to 5 of 42 customizations"
        }), /* @__PURE__ */ jsxs("div", {
          className: "flex items-center space-x-2",
          children: [/* @__PURE__ */ jsx("button", {
            className: "px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50",
            children: "Previous"
          }), /* @__PURE__ */ jsx("button", {
            className: "px-3 py-2 text-sm font-medium text-white bg-blue-500 border border-blue-500 rounded-md",
            children: "1"
          }), /* @__PURE__ */ jsx("button", {
            className: "px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50",
            children: "2"
          }), /* @__PURE__ */ jsx("button", {
            className: "px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50",
            children: "3"
          }), /* @__PURE__ */ jsx("button", {
            className: "px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50",
            children: "Next"
          })]
        })]
      })]
    })
  });
});
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: customizations_default
}, Symbol.toStringTag, { value: "Module" }));
const usageData = [{
  name: "Mon",
  requests: 12400,
  errors: 23
}, {
  name: "Tue",
  requests: 15600,
  errors: 18
}, {
  name: "Wed",
  requests: 18200,
  errors: 31
}, {
  name: "Thu",
  requests: 14800,
  errors: 15
}, {
  name: "Fri",
  requests: 22100,
  errors: 42
}, {
  name: "Sat",
  requests: 19500,
  errors: 28
}, {
  name: "Sun",
  requests: 16300,
  errors: 19
}];
const hourlyData = [{
  hour: "00",
  requests: 1200
}, {
  hour: "04",
  requests: 800
}, {
  hour: "08",
  requests: 2400
}, {
  hour: "12",
  requests: 3200
}, {
  hour: "16",
  requests: 2800
}, {
  hour: "20",
  requests: 1800
}];
const endpoints = [{
  name: "/api/ui-layer/get",
  requests: "234,567",
  avgResponse: "45ms",
  errorRate: "0.2%",
  status: "Healthy"
}, {
  name: "/api/ui-layer/update",
  requests: "98,432",
  avgResponse: "128ms",
  errorRate: "1.1%",
  status: "Warning"
}, {
  name: "/api/customization/create",
  requests: "76,543",
  avgResponse: "89ms",
  errorRate: "0.5%",
  status: "Healthy"
}, {
  name: "/api/customization/render",
  requests: "456,789",
  avgResponse: "67ms",
  errorRate: "0.8%",
  status: "Healthy"
}, {
  name: "/api/account/validate",
  requests: "123,456",
  avgResponse: "234ms",
  errorRate: "2.3%",
  status: "Critical"
}];
const recentActivity = [{
  time: "2 minutes ago",
  account: "Acme Corp",
  action: "Rendered header customization",
  status: "success",
  requests: 145
}, {
  time: "5 minutes ago",
  account: "TechStart Inc",
  action: "Updated theme layer",
  status: "success",
  requests: 78
}, {
  time: "8 minutes ago",
  account: "BuildCo Ltd",
  action: "API rate limit exceeded",
  status: "error",
  requests: 0
}, {
  time: "12 minutes ago",
  account: "Design Studio",
  action: "Created new button variant",
  status: "success",
  requests: 23
}, {
  time: "15 minutes ago",
  account: "StartupXYZ",
  action: "Fetched mobile layout",
  status: "success",
  requests: 156
}];
const apiUsage = UNSAFE_withComponentProps(function APIUsage() {
  return /* @__PURE__ */ jsx(DashboardLayout, {
    children: /* @__PURE__ */ jsxs("div", {
      className: "space-y-6",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("h1", {
            className: "text-2xl font-bold text-gray-900",
            children: "API Usage"
          }), /* @__PURE__ */ jsx("p", {
            className: "text-sm text-gray-500",
            children: "Monitor API performance and track usage patterns"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "flex items-center space-x-2",
          children: [/* @__PURE__ */ jsx("button", {
            className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50",
            children: "Export Report"
          }), /* @__PURE__ */ jsx("button", {
            className: "px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600",
            children: "View Logs"
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "grid grid-cols-1 md:grid-cols-4 gap-4",
        children: [/* @__PURE__ */ jsx("div", {
          className: "bg-white p-6 rounded-lg border border-gray-200",
          children: /* @__PURE__ */ jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("div", {
                className: "text-2xl font-bold text-gray-900",
                children: "847,283"
              }), /* @__PURE__ */ jsx("div", {
                className: "text-sm text-gray-500",
                children: "Total Requests"
              }), /* @__PURE__ */ jsx("div", {
                className: "text-xs text-green-500 mt-1",
                children: "+34% vs last week"
              })]
            }), /* @__PURE__ */ jsx(Activity, {
              className: "w-8 h-8 text-blue-500"
            })]
          })
        }), /* @__PURE__ */ jsx("div", {
          className: "bg-white p-6 rounded-lg border border-gray-200",
          children: /* @__PURE__ */ jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("div", {
                className: "text-2xl font-bold text-gray-900",
                children: "156ms"
              }), /* @__PURE__ */ jsx("div", {
                className: "text-sm text-gray-500",
                children: "Avg Response Time"
              }), /* @__PURE__ */ jsx("div", {
                className: "text-xs text-green-500 mt-1",
                children: "-12ms improvement"
              })]
            }), /* @__PURE__ */ jsx(CheckCircle, {
              className: "w-8 h-8 text-green-500"
            })]
          })
        }), /* @__PURE__ */ jsx("div", {
          className: "bg-white p-6 rounded-lg border border-gray-200",
          children: /* @__PURE__ */ jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("div", {
                className: "text-2xl font-bold text-gray-900",
                children: "99.7%"
              }), /* @__PURE__ */ jsx("div", {
                className: "text-sm text-gray-500",
                children: "Uptime"
              }), /* @__PURE__ */ jsx("div", {
                className: "text-xs text-green-500 mt-1",
                children: "+0.2% this month"
              })]
            }), /* @__PURE__ */ jsx(CheckCircle, {
              className: "w-8 h-8 text-green-500"
            })]
          })
        }), /* @__PURE__ */ jsx("div", {
          className: "bg-white p-6 rounded-lg border border-gray-200",
          children: /* @__PURE__ */ jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("div", {
                className: "text-2xl font-bold text-gray-900",
                children: "0.9%"
              }), /* @__PURE__ */ jsx("div", {
                className: "text-sm text-gray-500",
                children: "Error Rate"
              }), /* @__PURE__ */ jsx("div", {
                className: "text-xs text-yellow-500 mt-1",
                children: "+0.3% vs yesterday"
              })]
            }), /* @__PURE__ */ jsx(AlertTriangle, {
              className: "w-8 h-8 text-yellow-500"
            })]
          })
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "bg-white p-6 rounded-lg border border-gray-200",
          children: [/* @__PURE__ */ jsx("h3", {
            className: "text-lg font-semibold text-gray-900 mb-4",
            children: "Request Volume"
          }), /* @__PURE__ */ jsx("div", {
            className: "h-64",
            children: /* @__PURE__ */ jsx(ResponsiveContainer, {
              width: "100%",
              height: "100%",
              children: /* @__PURE__ */ jsxs(AreaChart, {
                data: usageData,
                children: [/* @__PURE__ */ jsx("defs", {
                  children: /* @__PURE__ */ jsxs("linearGradient", {
                    id: "colorRequests",
                    x1: "0",
                    y1: "0",
                    x2: "0",
                    y2: "1",
                    children: [/* @__PURE__ */ jsx("stop", {
                      offset: "5%",
                      stopColor: "#3b82f6",
                      stopOpacity: 0.8
                    }), /* @__PURE__ */ jsx("stop", {
                      offset: "95%",
                      stopColor: "#3b82f6",
                      stopOpacity: 0.1
                    })]
                  })
                }), /* @__PURE__ */ jsx(XAxis, {
                  dataKey: "name",
                  axisLine: false,
                  tickLine: false
                }), /* @__PURE__ */ jsx(YAxis, {
                  axisLine: false,
                  tickLine: false
                }), /* @__PURE__ */ jsx(Area, {
                  type: "monotone",
                  dataKey: "requests",
                  stroke: "#3b82f6",
                  fillOpacity: 1,
                  fill: "url(#colorRequests)"
                })]
              })
            })
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "bg-white p-6 rounded-lg border border-gray-200",
          children: [/* @__PURE__ */ jsx("h3", {
            className: "text-lg font-semibold text-gray-900 mb-4",
            children: "Hourly Usage Pattern"
          }), /* @__PURE__ */ jsx("div", {
            className: "h-64",
            children: /* @__PURE__ */ jsx(ResponsiveContainer, {
              width: "100%",
              height: "100%",
              children: /* @__PURE__ */ jsxs(BarChart, {
                data: hourlyData,
                children: [/* @__PURE__ */ jsx(XAxis, {
                  dataKey: "hour",
                  axisLine: false,
                  tickLine: false
                }), /* @__PURE__ */ jsx(YAxis, {
                  axisLine: false,
                  tickLine: false
                }), /* @__PURE__ */ jsx(Bar, {
                  dataKey: "requests",
                  fill: "#3b82f6",
                  radius: [4, 4, 0, 0]
                })]
              })
            })
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "bg-white rounded-lg border border-gray-200",
        children: [/* @__PURE__ */ jsx("div", {
          className: "p-6 border-b border-gray-200",
          children: /* @__PURE__ */ jsx("h3", {
            className: "text-lg font-semibold text-gray-900",
            children: "Endpoint Performance"
          })
        }), /* @__PURE__ */ jsx("div", {
          className: "overflow-x-auto",
          children: /* @__PURE__ */ jsxs("table", {
            className: "min-w-full divide-y divide-gray-200",
            children: [/* @__PURE__ */ jsx("thead", {
              className: "bg-gray-50",
              children: /* @__PURE__ */ jsxs("tr", {
                children: [/* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Endpoint"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Requests"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Avg Response"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Error Rate"
                }), /* @__PURE__ */ jsx("th", {
                  className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  children: "Status"
                })]
              })
            }), /* @__PURE__ */ jsx("tbody", {
              className: "bg-white divide-y divide-gray-200",
              children: endpoints.map((endpoint, index) => /* @__PURE__ */ jsxs("tr", {
                className: "hover:bg-gray-50",
                children: [/* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap",
                  children: /* @__PURE__ */ jsx("div", {
                    className: "text-sm font-mono text-gray-900",
                    children: endpoint.name
                  })
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                  children: endpoint.requests
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                  children: endpoint.avgResponse
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                  children: endpoint.errorRate
                }), /* @__PURE__ */ jsx("td", {
                  className: "px-6 py-4 whitespace-nowrap",
                  children: /* @__PURE__ */ jsx("span", {
                    className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${endpoint.status === "Healthy" ? "bg-green-100 text-green-800" : endpoint.status === "Warning" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`,
                    children: endpoint.status
                  })
                })]
              }, index))
            })]
          })
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "bg-white rounded-lg border border-gray-200",
        children: [/* @__PURE__ */ jsx("div", {
          className: "p-6 border-b border-gray-200",
          children: /* @__PURE__ */ jsx("h3", {
            className: "text-lg font-semibold text-gray-900",
            children: "Recent Activity"
          })
        }), /* @__PURE__ */ jsx("div", {
          className: "p-6",
          children: /* @__PURE__ */ jsx("div", {
            className: "space-y-4",
            children: recentActivity.map((activity, index) => /* @__PURE__ */ jsxs("div", {
              className: "flex items-start space-x-3",
              children: [/* @__PURE__ */ jsx("div", {
                className: `mt-1 w-2 h-2 rounded-full flex-shrink-0 ${activity.status === "success" ? "bg-green-400" : "bg-red-400"}`
              }), /* @__PURE__ */ jsxs("div", {
                className: "flex-1 min-w-0",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex items-center justify-between",
                  children: [/* @__PURE__ */ jsxs("p", {
                    className: "text-sm text-gray-900",
                    children: [/* @__PURE__ */ jsx("span", {
                      className: "font-medium",
                      children: activity.account
                    }), " ", activity.action]
                  }), /* @__PURE__ */ jsx("p", {
                    className: "text-xs text-gray-500",
                    children: activity.time
                  })]
                }), activity.requests > 0 && /* @__PURE__ */ jsxs("p", {
                  className: "text-xs text-gray-500",
                  children: ["Generated ", activity.requests, " requests"]
                })]
              })]
            }, index))
          })
        })]
      })]
    })
  });
});
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: apiUsage
}, Symbol.toStringTag, { value: "Module" }));
const apiKeys = UNSAFE_withComponentProps(function APIKeys() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    expires_at: ""
  });
  useEffect(() => {
    fetchTokens();
  }, []);
  const fetchTokens = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      console.log("DEBUG: Auth token exists:", !!token);
      if (token) {
        console.log("DEBUG: Token prefix:", token.substring(0, 20) + "...");
      }
      const data = await apiKeysApi.list();
      setTokens(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch API tokens:", error);
      if (error.response && error.response.status === 401) {
        console.log("DEBUG: 401 Unauthorized - redirecting to login");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }
      toast.error("Failed to load API tokens");
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Token name is required");
      return;
    }
    setCreating(true);
    try {
      const tokenData = {
        name: formData.name.trim()
      };
      if (formData.expires_at) {
        const expiryDate = /* @__PURE__ */ new Date(formData.expires_at + "T00:00:00Z");
        if (!isNaN(expiryDate.getTime())) {
          tokenData.expires_at = expiryDate.toISOString();
        }
      }
      const newTokenData = await apiKeysApi.create(tokenData);
      setNewToken(newTokenData);
      setFormData({
        name: "",
        expires_at: ""
      });
      toast.success("API token created successfully!");
      await fetchTokens();
    } catch (error) {
      console.error("Failed to create API token:", error);
      toast.error(error.message || "Failed to create API token");
    } finally {
      setCreating(false);
    }
  };
  const handleRevoke = async (tokenId, tokenName) => {
    if (!confirm(`Are you sure you want to revoke the "${tokenName}" API token? This cannot be undone.`)) {
      return;
    }
    try {
      await apiKeysApi.revoke(tokenId);
      toast.success("API token revoked successfully");
      await fetchTokens();
    } catch (error) {
      console.error("Failed to revoke API token:", error);
      toast.error(error.message || "Failed to revoke API token");
    }
  };
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  };
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < /* @__PURE__ */ new Date();
  };
  const activeTokens = tokens.filter((token) => token.is_active && !isExpired(token.expires_at));
  return /* @__PURE__ */ jsx(AuthWrapper, {
    children: /* @__PURE__ */ jsxs(DashboardLayout, {
      children: [/* @__PURE__ */ jsxs("div", {
        className: "space-y-6",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "flex items-center justify-between",
          children: [/* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("h1", {
              className: "text-2xl font-bold text-gray-900",
              children: "API Keys"
            }), /* @__PURE__ */ jsx("p", {
              className: "mt-1 text-sm text-gray-500",
              children: "Manage your API keys for programmatic access to Kuttl"
            })]
          }), /* @__PURE__ */ jsxs("button", {
            onClick: () => setShowCreateModal(true),
            className: "inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            children: [/* @__PURE__ */ jsx(Plus, {
              className: "w-4 h-4 mr-2"
            }), "Create New Token"]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "grid grid-cols-1 md:grid-cols-4 gap-4",
          children: [/* @__PURE__ */ jsxs("div", {
            className: "bg-white p-4 rounded-lg border border-gray-200",
            children: [/* @__PURE__ */ jsx("div", {
              className: "text-2xl font-bold text-gray-900",
              children: tokens.length
            }), /* @__PURE__ */ jsx("div", {
              className: "text-sm text-gray-500",
              children: "Total Keys"
            }), /* @__PURE__ */ jsx("div", {
              className: "text-xs text-gray-500 mt-1",
              children: "All time"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "bg-white p-4 rounded-lg border border-gray-200",
            children: [/* @__PURE__ */ jsx("div", {
              className: "text-2xl font-bold text-gray-900",
              children: activeTokens.length
            }), /* @__PURE__ */ jsx("div", {
              className: "text-sm text-gray-500",
              children: "Active Keys"
            }), /* @__PURE__ */ jsxs("div", {
              className: "text-xs text-green-500 mt-1",
              children: [tokens.length - activeTokens.length, " inactive"]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "bg-white p-4 rounded-lg border border-gray-200",
            children: [/* @__PURE__ */ jsx("div", {
              className: "text-2xl font-bold text-gray-900",
              children: "-"
            }), /* @__PURE__ */ jsx("div", {
              className: "text-sm text-gray-500",
              children: "Total Requests"
            }), /* @__PURE__ */ jsx("div", {
              className: "text-xs text-gray-500 mt-1",
              children: "Coming soon"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "bg-white p-4 rounded-lg border border-gray-200",
            children: [/* @__PURE__ */ jsx("div", {
              className: "text-2xl font-bold text-gray-900",
              children: "-"
            }), /* @__PURE__ */ jsx("div", {
              className: "text-sm text-gray-500",
              children: "Success Rate"
            }), /* @__PURE__ */ jsx("div", {
              className: "text-xs text-gray-500 mt-1",
              children: "Coming soon"
            })]
          })]
        }), /* @__PURE__ */ jsx("div", {
          className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4",
          children: /* @__PURE__ */ jsxs("div", {
            className: "flex",
            children: [/* @__PURE__ */ jsx("div", {
              className: "flex-shrink-0",
              children: /* @__PURE__ */ jsx("svg", {
                className: "h-5 w-5 text-yellow-400",
                fill: "currentColor",
                viewBox: "0 0 20 20",
                children: /* @__PURE__ */ jsx("path", {
                  fillRule: "evenodd",
                  d: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z",
                  clipRule: "evenodd"
                })
              })
            }), /* @__PURE__ */ jsxs("div", {
              className: "ml-3",
              children: [/* @__PURE__ */ jsx("h3", {
                className: "text-sm font-medium text-yellow-800",
                children: "Security Reminder"
              }), /* @__PURE__ */ jsx("div", {
                className: "mt-2 text-sm text-yellow-700",
                children: /* @__PURE__ */ jsx("p", {
                  children: "Keep your API keys secure and never expose them in client-side code. Rotate keys regularly and revoke unused keys."
                })
              })]
            })]
          })
        }), /* @__PURE__ */ jsxs("div", {
          className: "bg-white border border-gray-200 rounded-lg",
          children: [/* @__PURE__ */ jsx("div", {
            className: "px-6 py-4 border-b border-gray-200",
            children: /* @__PURE__ */ jsx("h3", {
              className: "text-lg font-medium text-gray-900",
              children: "Your API Tokens"
            })
          }), loading ? /* @__PURE__ */ jsx("div", {
            className: "p-6",
            children: /* @__PURE__ */ jsx("div", {
              className: "animate-pulse space-y-4",
              children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxs("div", {
                className: "flex items-center space-x-4",
                children: [/* @__PURE__ */ jsx("div", {
                  className: "w-8 h-8 bg-gray-200 rounded-full"
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex-1 space-y-2",
                  children: [/* @__PURE__ */ jsx("div", {
                    className: "h-4 bg-gray-200 rounded w-1/4"
                  }), /* @__PURE__ */ jsx("div", {
                    className: "h-3 bg-gray-200 rounded w-1/3"
                  })]
                }), /* @__PURE__ */ jsx("div", {
                  className: "w-20 h-8 bg-gray-200 rounded"
                })]
              }, i))
            })
          }) : tokens.length === 0 ? /* @__PURE__ */ jsxs("div", {
            className: "p-8 text-center text-gray-500",
            children: [/* @__PURE__ */ jsx(Key, {
              className: "w-12 h-12 mx-auto mb-4 text-gray-300"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-lg font-medium",
              children: "No API tokens"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-sm mt-1",
              children: "Create your first API token to get started"
            })]
          }) : /* @__PURE__ */ jsx("div", {
            className: "divide-y divide-gray-200",
            children: tokens.map((token) => /* @__PURE__ */ jsx("div", {
              className: "p-6 hover:bg-gray-50",
              children: /* @__PURE__ */ jsxs("div", {
                className: "flex items-center justify-between",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex items-center space-x-4",
                  children: [/* @__PURE__ */ jsx("div", {
                    className: "w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center",
                    children: /* @__PURE__ */ jsx(Key, {
                      className: "w-4 h-4 text-blue-600"
                    })
                  }), /* @__PURE__ */ jsxs("div", {
                    children: [/* @__PURE__ */ jsx("h4", {
                      className: "text-sm font-medium text-gray-900",
                      children: token.name
                    }), /* @__PURE__ */ jsxs("div", {
                      className: "flex items-center space-x-4 mt-1 text-xs text-gray-500",
                      children: [/* @__PURE__ */ jsxs("span", {
                        children: [/* @__PURE__ */ jsx("strong", {
                          children: "Created:"
                        }), " ", formatDate(token.created_at)]
                      }), token.last_used && /* @__PURE__ */ jsxs("span", {
                        children: [/* @__PURE__ */ jsx("strong", {
                          children: "Last used:"
                        }), " ", formatDate(token.last_used)]
                      }), token.expires_at && /* @__PURE__ */ jsxs("span", {
                        className: isExpired(token.expires_at) ? "text-red-600" : "",
                        children: [/* @__PURE__ */ jsx("strong", {
                          children: "Expires:"
                        }), " ", formatDate(token.expires_at), isExpired(token.expires_at) && " (Expired)"]
                      })]
                    })]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex items-center space-x-2",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: `inline-flex px-2 py-1 text-xs font-medium rounded-full ${token.is_active && !isExpired(token.expires_at) ? " text-green-700" : " text-red-700"}`,
                    children: token.is_active && !isExpired(token.expires_at) ? "Active" : "Inactive"
                  }), /* @__PURE__ */ jsx("button", {
                    onClick: () => handleRevoke(token.id, token.name),
                    className: "p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded",
                    title: "Revoke token",
                    children: /* @__PURE__ */ jsx(Trash2, {
                      className: "w-4 h-4"
                    })
                  })]
                })]
              })
            }, token.id))
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "bg-blue-50 border border-blue-200 rounded-lg p-6",
          children: [/* @__PURE__ */ jsx("h3", {
            className: "text-lg font-medium text-blue-900 mb-3",
            children: "Using Your API Tokens"
          }), /* @__PURE__ */ jsxs("div", {
            className: "space-y-3 text-sm text-blue-800",
            children: [/* @__PURE__ */ jsx("p", {
              children: "Include your API token in the Authorization header of your HTTP requests:"
            }), /* @__PURE__ */ jsx("div", {
              className: "bg-white border border-blue-300 rounded p-3",
              children: /* @__PURE__ */ jsx("code", {
                className: "text-xs font-mono text-gray-900",
                children: "Authorization: Bearer YOUR_API_TOKEN"
              })
            }), /* @__PURE__ */ jsx("p", {
              children: "Example with curl:"
            }), /* @__PURE__ */ jsx("div", {
              className: "bg-white border border-blue-300 rounded p-3",
              children: /* @__PURE__ */ jsxs("code", {
                className: "text-xs font-mono text-gray-900",
                children: ['curl -H "Authorization: Bearer YOUR_API_TOKEN" ', typeof window !== "undefined" ? window.location.origin : "https://api.kuttl.xyz", "/api/v1/snapshots"]
              })
            })]
          })]
        })]
      }), showCreateModal && typeof window !== "undefined" && createPortal(/* @__PURE__ */ jsxs("div", {
        className: "fixed inset-0 z-[9999] flex items-center justify-center p-4",
        children: [/* @__PURE__ */ jsx("div", {
          className: "absolute inset-0 bg-gray-900/50 backdrop-blur-sm",
          onClick: () => {
            if (!newToken) {
              setShowCreateModal(false);
              setFormData({
                name: "",
                expires_at: ""
              });
            }
          }
        }), /* @__PURE__ */ jsx("div", {
          className: "relative w-full max-w-lg",
          children: /* @__PURE__ */ jsx("div", {
            className: "relative bg-white rounded-2xl shadow-2xl",
            children: !newToken ? (
              // Create Token Form
              /* @__PURE__ */ jsxs("div", {
                className: "p-8",
                children: [/* @__PURE__ */ jsx("button", {
                  type: "button",
                  className: "absolute right-4 top-4 text-gray-400 hover:text-gray-600",
                  onClick: () => {
                    setShowCreateModal(false);
                    setFormData({
                      name: "",
                      expires_at: ""
                    });
                  },
                  children: /* @__PURE__ */ jsx("svg", {
                    className: "h-6 w-6",
                    fill: "none",
                    viewBox: "0 0 24 24",
                    stroke: "currentColor",
                    children: /* @__PURE__ */ jsx("path", {
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      strokeWidth: 2,
                      d: "M6 18L18 6M6 6l12 12"
                    })
                  })
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex items-center space-x-4 mb-6",
                  children: [/* @__PURE__ */ jsx("div", {
                    className: "w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center",
                    children: /* @__PURE__ */ jsx(Key, {
                      className: "h-6 w-6 text-blue-600"
                    })
                  }), /* @__PURE__ */ jsxs("div", {
                    children: [/* @__PURE__ */ jsx("h3", {
                      className: "text-xl font-semibold text-gray-900",
                      children: "Create New API Token"
                    }), /* @__PURE__ */ jsx("p", {
                      className: "text-sm text-gray-500",
                      children: "Generate a new API token for programmatic access"
                    })]
                  })]
                }), /* @__PURE__ */ jsxs("form", {
                  onSubmit: handleCreate,
                  className: "space-y-4",
                  children: [/* @__PURE__ */ jsxs("div", {
                    children: [/* @__PURE__ */ jsx("label", {
                      htmlFor: "modal-name",
                      className: "block text-sm font-medium text-gray-700 mb-2",
                      children: "Token Name *"
                    }), /* @__PURE__ */ jsx("input", {
                      type: "text",
                      id: "modal-name",
                      value: formData.name,
                      onChange: (e) => setFormData({
                        ...formData,
                        name: e.target.value
                      }),
                      placeholder: "e.g., My Website Integration",
                      required: true,
                      className: "block w-full rounded-lg border-gray-300 border px-3 py-3 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    })]
                  }), /* @__PURE__ */ jsxs("div", {
                    children: [/* @__PURE__ */ jsx("label", {
                      htmlFor: "modal-expires",
                      className: "block text-sm font-medium text-gray-700 mb-2",
                      children: "Expiration Date (optional)"
                    }), /* @__PURE__ */ jsx("input", {
                      type: "date",
                      id: "modal-expires",
                      value: formData.expires_at,
                      onChange: (e) => setFormData({
                        ...formData,
                        expires_at: e.target.value
                      }),
                      className: "block w-full rounded-lg border-gray-300 border px-3 py-3 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    }), /* @__PURE__ */ jsx("p", {
                      className: "mt-1 text-xs text-gray-500",
                      children: "Leave empty for tokens that never expire"
                    })]
                  }), /* @__PURE__ */ jsxs("div", {
                    className: "flex gap-3 pt-4",
                    children: [/* @__PURE__ */ jsx("button", {
                      type: "button",
                      onClick: () => {
                        setShowCreateModal(false);
                        setFormData({
                          name: "",
                          expires_at: ""
                        });
                      },
                      className: "flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors",
                      children: "Cancel"
                    }), /* @__PURE__ */ jsx("button", {
                      type: "submit",
                      disabled: creating,
                      className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                      children: creating ? "Creating..." : "Create Token"
                    })]
                  })]
                })]
              })
            ) : (
              // Token Success Display
              /* @__PURE__ */ jsxs("div", {
                className: "p-8",
                children: [/* @__PURE__ */ jsx("button", {
                  type: "button",
                  className: "absolute right-4 top-4 text-gray-400 hover:text-gray-600",
                  onClick: () => {
                    setNewToken(null);
                    setShowCreateModal(false);
                    setFormData({
                      name: "",
                      expires_at: ""
                    });
                  },
                  children: /* @__PURE__ */ jsx("svg", {
                    className: "h-6 w-6",
                    fill: "none",
                    viewBox: "0 0 24 24",
                    stroke: "currentColor",
                    children: /* @__PURE__ */ jsx("path", {
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      strokeWidth: 2,
                      d: "M6 18L18 6M6 6l12 12"
                    })
                  })
                }), /* @__PURE__ */ jsxs("div", {
                  className: "text-center mb-8",
                  children: [/* @__PURE__ */ jsx("h3", {
                    className: "text-2xl font-bold text-gray-900 mb-2",
                    children: "Generate Secret Key"
                  }), /* @__PURE__ */ jsx("p", {
                    className: "text-gray-600",
                    children: "For security, this key will only be shown once. Please store it in a safe place."
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "space-y-6",
                  children: [/* @__PURE__ */ jsxs("div", {
                    className: "flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border",
                    children: [/* @__PURE__ */ jsx("div", {
                      className: "w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center",
                      children: /* @__PURE__ */ jsx("svg", {
                        className: "w-6 h-6 text-gray-600",
                        fill: "none",
                        stroke: "currentColor",
                        viewBox: "0 0 24 24",
                        children: /* @__PURE__ */ jsx("path", {
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          strokeWidth: 2,
                          d: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        })
                      })
                    }), /* @__PURE__ */ jsxs("div", {
                      className: "flex-1",
                      children: [/* @__PURE__ */ jsx("div", {
                        className: "text-sm font-medium text-gray-900 mb-1",
                        children: "API Access Token"
                      }), /* @__PURE__ */ jsx("code", {
                        className: "text-sm text-gray-600 font-mono break-all",
                        children: newToken.token
                      })]
                    }), /* @__PURE__ */ jsx("button", {
                      onClick: () => copyToClipboard(newToken.token, "API token"),
                      className: "px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border transition-colors",
                      children: "Copy"
                    })]
                  }), /* @__PURE__ */ jsx("button", {
                    onClick: () => {
                      setNewToken(null);
                      setShowCreateModal(false);
                      setFormData({
                        name: "",
                        expires_at: ""
                      });
                    },
                    className: "w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors",
                    children: "Done"
                  })]
                })]
              })
            )
          })
        })]
      }), document.body)]
    })
  });
});
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: apiKeys
}, Symbol.toStringTag, { value: "Module" }));
const changelogEntries = [{
  id: 1,
  version: "v2.1.0",
  date: "May 8, 2026",
  type: "feature",
  title: "Enhanced UI Layer Performance",
  description: "Improved rendering speed for complex customizations by 40%. New caching mechanism for frequently used components.",
  changes: ["Added intelligent caching for UI layer components", "Optimized CSS injection for better performance", "Reduced initial load time by 25%"]
}, {
  id: 2,
  version: "v2.0.5",
  date: "May 3, 2026",
  type: "fix",
  title: "Account Management Fixes",
  description: "Fixed critical issues with account creation and API key generation.",
  changes: ["Fixed account creation failing for certain email domains", "Resolved API key regeneration timeout issues", "Improved error messaging for invalid account operations"]
}, {
  id: 3,
  version: "v2.0.4",
  date: "April 28, 2026",
  type: "improvement",
  title: "Customization Editor Updates",
  description: "Enhanced the customization editor with better preview capabilities and real-time validation.",
  changes: ["Added live preview for customization changes", "Improved CSS validation with helpful error messages", "New component library with 50+ pre-built elements"]
}, {
  id: 4,
  version: "v2.0.3",
  date: "April 22, 2026",
  type: "security",
  title: "Security Enhancements",
  description: "Important security updates and improvements to API authentication.",
  changes: ["Enhanced API key encryption", "Added rate limiting for all endpoints", "Improved CORS handling for cross-origin requests", "Updated dependencies to patch security vulnerabilities"]
}, {
  id: 5,
  version: "v2.0.2",
  date: "April 15, 2026",
  type: "feature",
  title: "Webhook Integration",
  description: "Added comprehensive webhook support for real-time notifications of customization events.",
  changes: ["New webhook endpoints for customization events", "Configurable webhook retry logic", "Webhook payload validation and signing", "Dashboard for managing webhook subscriptions"]
}];
const typeConfig = {
  feature: {
    icon: Zap,
    color: "bg-blue-100 text-blue-800",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  fix: {
    icon: Bug,
    color: "bg-red-100 text-red-800",
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
  },
  improvement: {
    icon: Wrench,
    color: "bg-green-100 text-green-800",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  security: {
    icon: AlertTriangle,
    color: "bg-yellow-100 text-yellow-800",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200"
  }
};
const changelog = UNSAFE_withComponentProps(function Changelog() {
  return /* @__PURE__ */ jsx(DashboardLayout, {
    children: /* @__PURE__ */ jsxs("div", {
      className: "space-y-6",
      children: [/* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-between",
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("h1", {
            className: "text-2xl font-bold text-gray-900",
            children: "Changelog"
          }), /* @__PURE__ */ jsx("p", {
            className: "text-sm text-gray-500",
            children: "Track updates and improvements to the Kuttl platform"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "flex items-center space-x-2",
          children: [/* @__PURE__ */ jsx("span", {
            className: "text-sm text-gray-500",
            children: "Latest:"
          }), /* @__PURE__ */ jsx("span", {
            className: "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800",
            children: "v2.1.0"
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "bg-white rounded-lg border border-gray-200 p-6",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "flex items-center justify-between mb-4",
          children: [/* @__PURE__ */ jsx("h3", {
            className: "text-lg font-semibold text-gray-900",
            children: "Recent Activity"
          }), /* @__PURE__ */ jsxs("div", {
            className: "flex items-center space-x-4 text-sm text-gray-500",
            children: [/* @__PURE__ */ jsxs("div", {
              className: "flex items-center space-x-1",
              children: [/* @__PURE__ */ jsx("div", {
                className: "w-2 h-2 bg-blue-400 rounded-full"
              }), /* @__PURE__ */ jsx("span", {
                children: "Features"
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "flex items-center space-x-1",
              children: [/* @__PURE__ */ jsx("div", {
                className: "w-2 h-2 bg-green-400 rounded-full"
              }), /* @__PURE__ */ jsx("span", {
                children: "Improvements"
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "flex items-center space-x-1",
              children: [/* @__PURE__ */ jsx("div", {
                className: "w-2 h-2 bg-red-400 rounded-full"
              }), /* @__PURE__ */ jsx("span", {
                children: "Fixes"
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "grid grid-cols-1 md:grid-cols-3 gap-4",
          children: [/* @__PURE__ */ jsxs("div", {
            className: "text-center p-4 bg-blue-50 rounded-lg",
            children: [/* @__PURE__ */ jsx("div", {
              className: "text-2xl font-bold text-blue-600",
              children: "8"
            }), /* @__PURE__ */ jsx("div", {
              className: "text-sm text-gray-500",
              children: "Features Added"
            }), /* @__PURE__ */ jsx("div", {
              className: "text-xs text-green-500 mt-1",
              children: "This month"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "text-center p-4 bg-green-50 rounded-lg",
            children: [/* @__PURE__ */ jsx("div", {
              className: "text-2xl font-bold text-green-600",
              children: "15"
            }), /* @__PURE__ */ jsx("div", {
              className: "text-sm text-gray-500",
              children: "Improvements"
            }), /* @__PURE__ */ jsx("div", {
              className: "text-xs text-green-500 mt-1",
              children: "This month"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "text-center p-4 bg-red-50 rounded-lg",
            children: [/* @__PURE__ */ jsx("div", {
              className: "text-2xl font-bold text-red-600",
              children: "12"
            }), /* @__PURE__ */ jsx("div", {
              className: "text-sm text-gray-500",
              children: "Issues Fixed"
            }), /* @__PURE__ */ jsx("div", {
              className: "text-xs text-green-500 mt-1",
              children: "This month"
            })]
          })]
        })]
      }), /* @__PURE__ */ jsx("div", {
        className: "space-y-6",
        children: changelogEntries.map((entry2) => {
          const config = typeConfig[entry2.type];
          const IconComponent = config.icon;
          return /* @__PURE__ */ jsx("div", {
            className: `bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${config.bgColor} ${config.borderColor}`,
            children: /* @__PURE__ */ jsxs("div", {
              className: "p-6",
              children: [/* @__PURE__ */ jsx("div", {
                className: "flex items-start justify-between mb-4",
                children: /* @__PURE__ */ jsxs("div", {
                  className: "flex items-center space-x-3",
                  children: [/* @__PURE__ */ jsx("div", {
                    className: `p-2 rounded-full ${config.color.replace("text-", "bg-").replace("800", "200")}`,
                    children: /* @__PURE__ */ jsx(IconComponent, {
                      className: "w-4 h-4"
                    })
                  }), /* @__PURE__ */ jsxs("div", {
                    children: [/* @__PURE__ */ jsxs("div", {
                      className: "flex items-center space-x-2",
                      children: [/* @__PURE__ */ jsx("h3", {
                        className: "text-lg font-semibold text-gray-900",
                        children: entry2.title
                      }), /* @__PURE__ */ jsx("span", {
                        className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`,
                        children: entry2.type
                      })]
                    }), /* @__PURE__ */ jsxs("div", {
                      className: "flex items-center space-x-2 mt-1",
                      children: [/* @__PURE__ */ jsx("span", {
                        className: "text-sm font-medium text-gray-600",
                        children: entry2.version
                      }), /* @__PURE__ */ jsx("span", {
                        className: "text-sm text-gray-500",
                        children: "•"
                      }), /* @__PURE__ */ jsx("span", {
                        className: "text-sm text-gray-500",
                        children: entry2.date
                      })]
                    })]
                  })]
                })
              }), /* @__PURE__ */ jsx("p", {
                className: "text-gray-700 mb-4",
                children: entry2.description
              }), /* @__PURE__ */ jsxs("div", {
                className: "space-y-2",
                children: [/* @__PURE__ */ jsx("h4", {
                  className: "text-sm font-medium text-gray-900",
                  children: "Changes:"
                }), /* @__PURE__ */ jsx("ul", {
                  className: "space-y-1",
                  children: entry2.changes.map((change, index) => /* @__PURE__ */ jsxs("li", {
                    className: "flex items-start space-x-2 text-sm text-gray-600",
                    children: [/* @__PURE__ */ jsx(CheckCircle, {
                      className: "w-4 h-4 text-green-500 mt-0.5 flex-shrink-0"
                    }), /* @__PURE__ */ jsx("span", {
                      children: change
                    })]
                  }, index))
                })]
              })]
            })
          }, entry2.id);
        })
      }), /* @__PURE__ */ jsxs("div", {
        className: "text-center py-8",
        children: [/* @__PURE__ */ jsx("p", {
          className: "text-sm text-gray-500 mb-4",
          children: "Want to see older releases?"
        }), /* @__PURE__ */ jsxs("button", {
          className: "inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors",
          children: [/* @__PURE__ */ jsx(Plus, {
            className: "w-4 h-4"
          }), /* @__PURE__ */ jsx("span", {
            children: "Load More Entries"
          })]
        })]
      })]
    })
  });
});
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: changelog
}, Symbol.toStringTag, { value: "Module" }));
const settings = UNSAFE_withComponentProps(function Settings2() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "Jevline",
    lastName: "Kief",
    email: "j.kief@kuttl.xyz",
    company: "Kuttl Inc.",
    jobTitle: "Product Manager",
    timezone: "UTC-8 (Pacific Time)",
    avatar: ""
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    securityAlerts: true,
    productUpdates: false,
    marketingEmails: false,
    weeklyReports: true,
    apiLimitWarnings: true
  });
  const handleProfileChange = (e) => {
    const {
      name,
      value
    } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  const handlePasswordChange = (e) => {
    const {
      name,
      value
    } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (name === "newPassword") {
      setPasswordRequirements({
        minLength: value.length >= 8,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasNumber: /\d/.test(value),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(value)
      });
    }
  };
  const handleNotificationChange = (setting) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  const passwordsMatch = passwordData.newPassword === passwordData.confirmPassword && passwordData.confirmPassword !== "";
  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
  const tabs = [{
    id: "profile",
    name: "Profile",
    icon: User
  }, {
    id: "security",
    name: "Security",
    icon: Shield
  }, {
    id: "notifications",
    name: "Notifications",
    icon: Bell
  }, {
    id: "billing",
    name: "Billing",
    icon: CreditCard
  }];
  return /* @__PURE__ */ jsx(DashboardLayout, {
    children: /* @__PURE__ */ jsxs("div", {
      className: "space-y-6",
      children: [/* @__PURE__ */ jsxs("div", {
        children: [/* @__PURE__ */ jsx("h1", {
          className: "text-2xl font-bold text-gray-900",
          children: "Account Settings"
        }), /* @__PURE__ */ jsx("p", {
          className: "text-sm text-gray-500",
          children: "Manage your account preferences and security settings"
        })]
      }), /* @__PURE__ */ jsxs("div", {
        className: "flex flex-col lg:flex-row gap-6",
        children: [/* @__PURE__ */ jsx("div", {
          className: "lg:w-64",
          children: /* @__PURE__ */ jsx("nav", {
            className: "space-y-1",
            children: tabs.map((tab) => {
              const IconComponent = tab.icon;
              return /* @__PURE__ */ jsxs("button", {
                onClick: () => setActiveTab(tab.id),
                className: `w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id ? "bg-blue-50 text-blue-600 border-r-2 border-blue-500" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}`,
                children: [/* @__PURE__ */ jsx(IconComponent, {
                  className: "mr-3 h-5 w-5 flex-shrink-0"
                }), tab.name]
              }, tab.id);
            })
          })
        }), /* @__PURE__ */ jsxs("div", {
          className: "flex-1",
          children: [activeTab === "profile" && /* @__PURE__ */ jsxs("div", {
            className: "bg-white rounded-lg border border-gray-200 p-6",
            children: [/* @__PURE__ */ jsx("h2", {
              className: "text-lg font-semibold text-gray-900 mb-6",
              children: "Profile Information"
            }), /* @__PURE__ */ jsxs("form", {
              className: "space-y-6",
              children: [/* @__PURE__ */ jsxs("div", {
                className: "flex items-center space-x-4",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-medium",
                  children: [profileData.firstName.charAt(0), profileData.lastName.charAt(0)]
                }), /* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("button", {
                    className: "px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100",
                    children: "Change avatar"
                  }), /* @__PURE__ */ jsx("p", {
                    className: "text-xs text-gray-500 mt-1",
                    children: "JPG, PNG up to 2MB"
                  })]
                })]
              }), /* @__PURE__ */ jsxs("div", {
                className: "grid grid-cols-1 md:grid-cols-2 gap-6",
                children: [/* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("label", {
                    className: "block text-sm font-medium text-gray-700 mb-1",
                    children: "First name"
                  }), /* @__PURE__ */ jsx("input", {
                    type: "text",
                    name: "firstName",
                    value: profileData.firstName,
                    onChange: handleProfileChange,
                    className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("label", {
                    className: "block text-sm font-medium text-gray-700 mb-1",
                    children: "Last name"
                  }), /* @__PURE__ */ jsx("input", {
                    type: "text",
                    name: "lastName",
                    value: profileData.lastName,
                    onChange: handleProfileChange,
                    className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  })]
                })]
              }), /* @__PURE__ */ jsxs("div", {
                children: [/* @__PURE__ */ jsx("label", {
                  className: "block text-sm font-medium text-gray-700 mb-1",
                  children: "Email address"
                }), /* @__PURE__ */ jsx("input", {
                  type: "email",
                  name: "email",
                  value: profileData.email,
                  onChange: handleProfileChange,
                  className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                })]
              }), /* @__PURE__ */ jsxs("div", {
                className: "grid grid-cols-1 md:grid-cols-2 gap-6",
                children: [/* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("label", {
                    className: "block text-sm font-medium text-gray-700 mb-1",
                    children: "Company"
                  }), /* @__PURE__ */ jsx("input", {
                    type: "text",
                    name: "company",
                    value: profileData.company,
                    onChange: handleProfileChange,
                    className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("label", {
                    className: "block text-sm font-medium text-gray-700 mb-1",
                    children: "Job title"
                  }), /* @__PURE__ */ jsx("input", {
                    type: "text",
                    name: "jobTitle",
                    value: profileData.jobTitle,
                    onChange: handleProfileChange,
                    className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  })]
                })]
              }), /* @__PURE__ */ jsxs("div", {
                children: [/* @__PURE__ */ jsx("label", {
                  className: "block text-sm font-medium text-gray-700 mb-1",
                  children: "Timezone"
                }), /* @__PURE__ */ jsxs("select", {
                  name: "timezone",
                  value: profileData.timezone,
                  onChange: handleProfileChange,
                  className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  children: [/* @__PURE__ */ jsx("option", {
                    value: "UTC-8 (Pacific Time)",
                    children: "UTC-8 (Pacific Time)"
                  }), /* @__PURE__ */ jsx("option", {
                    value: "UTC-5 (Eastern Time)",
                    children: "UTC-5 (Eastern Time)"
                  }), /* @__PURE__ */ jsx("option", {
                    value: "UTC+0 (GMT)",
                    children: "UTC+0 (GMT)"
                  }), /* @__PURE__ */ jsx("option", {
                    value: "UTC+1 (CET)",
                    children: "UTC+1 (CET)"
                  })]
                })]
              }), /* @__PURE__ */ jsx("div", {
                className: "pt-4",
                children: /* @__PURE__ */ jsxs("button", {
                  className: "flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500",
                  children: [/* @__PURE__ */ jsx(Save, {
                    className: "w-4 h-4"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "Save changes"
                  })]
                })
              })]
            })]
          }), activeTab === "security" && /* @__PURE__ */ jsxs("div", {
            className: "space-y-6",
            children: [/* @__PURE__ */ jsxs("div", {
              className: "bg-white rounded-lg border border-gray-200 p-6",
              children: [/* @__PURE__ */ jsx("h2", {
                className: "text-lg font-semibold text-gray-900 mb-6",
                children: "Change Password"
              }), /* @__PURE__ */ jsxs("form", {
                className: "space-y-6",
                children: [/* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("label", {
                    className: "block text-sm font-medium text-gray-700 mb-1",
                    children: "Current password"
                  }), /* @__PURE__ */ jsxs("div", {
                    className: "relative",
                    children: [/* @__PURE__ */ jsx("input", {
                      type: showCurrentPassword ? "text" : "password",
                      name: "currentPassword",
                      value: passwordData.currentPassword,
                      onChange: handlePasswordChange,
                      className: "w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                      placeholder: "Enter current password"
                    }), /* @__PURE__ */ jsx("button", {
                      type: "button",
                      className: "absolute inset-y-0 right-0 pr-3 flex items-center",
                      onClick: () => setShowCurrentPassword(!showCurrentPassword),
                      children: showCurrentPassword ? /* @__PURE__ */ jsx(EyeOff, {
                        className: "h-4 w-4 text-gray-400"
                      }) : /* @__PURE__ */ jsx(Eye, {
                        className: "h-4 w-4 text-gray-400"
                      })
                    })]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("label", {
                    className: "block text-sm font-medium text-gray-700 mb-1",
                    children: "New password"
                  }), /* @__PURE__ */ jsxs("div", {
                    className: "relative",
                    children: [/* @__PURE__ */ jsx("input", {
                      type: showNewPassword ? "text" : "password",
                      name: "newPassword",
                      value: passwordData.newPassword,
                      onChange: handlePasswordChange,
                      className: "w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                      placeholder: "Enter new password"
                    }), /* @__PURE__ */ jsx("button", {
                      type: "button",
                      className: "absolute inset-y-0 right-0 pr-3 flex items-center",
                      onClick: () => setShowNewPassword(!showNewPassword),
                      children: showNewPassword ? /* @__PURE__ */ jsx(EyeOff, {
                        className: "h-4 w-4 text-gray-400"
                      }) : /* @__PURE__ */ jsx(Eye, {
                        className: "h-4 w-4 text-gray-400"
                      })
                    })]
                  }), passwordData.newPassword && /* @__PURE__ */ jsxs("div", {
                    className: "mt-2 space-y-1",
                    children: [/* @__PURE__ */ jsx("div", {
                      className: "text-xs text-gray-600",
                      children: "Password must contain:"
                    }), /* @__PURE__ */ jsxs("div", {
                      className: "grid grid-cols-2 gap-1 text-xs",
                      children: [/* @__PURE__ */ jsxs("div", {
                        className: `flex items-center space-x-1 ${passwordRequirements.minLength ? "text-green-600" : "text-gray-400"}`,
                        children: [/* @__PURE__ */ jsx(Check, {
                          className: "w-3 h-3"
                        }), /* @__PURE__ */ jsx("span", {
                          children: "8+ characters"
                        })]
                      }), /* @__PURE__ */ jsxs("div", {
                        className: `flex items-center space-x-1 ${passwordRequirements.hasUppercase ? "text-green-600" : "text-gray-400"}`,
                        children: [/* @__PURE__ */ jsx(Check, {
                          className: "w-3 h-3"
                        }), /* @__PURE__ */ jsx("span", {
                          children: "Uppercase"
                        })]
                      }), /* @__PURE__ */ jsxs("div", {
                        className: `flex items-center space-x-1 ${passwordRequirements.hasLowercase ? "text-green-600" : "text-gray-400"}`,
                        children: [/* @__PURE__ */ jsx(Check, {
                          className: "w-3 h-3"
                        }), /* @__PURE__ */ jsx("span", {
                          children: "Lowercase"
                        })]
                      }), /* @__PURE__ */ jsxs("div", {
                        className: `flex items-center space-x-1 ${passwordRequirements.hasNumber ? "text-green-600" : "text-gray-400"}`,
                        children: [/* @__PURE__ */ jsx(Check, {
                          className: "w-3 h-3"
                        }), /* @__PURE__ */ jsx("span", {
                          children: "Number"
                        })]
                      }), /* @__PURE__ */ jsxs("div", {
                        className: `flex items-center space-x-1 ${passwordRequirements.hasSpecialChar ? "text-green-600" : "text-gray-400"} col-span-2`,
                        children: [/* @__PURE__ */ jsx(Check, {
                          className: "w-3 h-3"
                        }), /* @__PURE__ */ jsx("span", {
                          children: "Special character"
                        })]
                      })]
                    })]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("label", {
                    className: "block text-sm font-medium text-gray-700 mb-1",
                    children: "Confirm new password"
                  }), /* @__PURE__ */ jsxs("div", {
                    className: "relative",
                    children: [/* @__PURE__ */ jsx("input", {
                      type: showConfirmPassword ? "text" : "password",
                      name: "confirmPassword",
                      value: passwordData.confirmPassword,
                      onChange: handlePasswordChange,
                      className: `w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 ${passwordData.confirmPassword && !passwordsMatch ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}`,
                      placeholder: "Confirm new password"
                    }), /* @__PURE__ */ jsx("button", {
                      type: "button",
                      className: "absolute inset-y-0 right-0 pr-3 flex items-center",
                      onClick: () => setShowConfirmPassword(!showConfirmPassword),
                      children: showConfirmPassword ? /* @__PURE__ */ jsx(EyeOff, {
                        className: "h-4 w-4 text-gray-400"
                      }) : /* @__PURE__ */ jsx(Eye, {
                        className: "h-4 w-4 text-gray-400"
                      })
                    })]
                  }), passwordData.confirmPassword && !passwordsMatch && /* @__PURE__ */ jsx("p", {
                    className: "mt-1 text-xs text-red-600",
                    children: "Passwords do not match"
                  }), passwordsMatch && /* @__PURE__ */ jsx("p", {
                    className: "mt-1 text-xs text-green-600",
                    children: "Passwords match"
                  })]
                }), /* @__PURE__ */ jsxs("button", {
                  type: "submit",
                  disabled: !allRequirementsMet || !passwordsMatch || !passwordData.currentPassword,
                  className: "flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed",
                  children: [/* @__PURE__ */ jsx(Save, {
                    className: "w-4 h-4"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "Update password"
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "bg-white rounded-lg border border-gray-200 p-6",
              children: [/* @__PURE__ */ jsx("h2", {
                className: "text-lg font-semibold text-gray-900 mb-4",
                children: "Two-Factor Authentication"
              }), /* @__PURE__ */ jsx("p", {
                className: "text-sm text-gray-600 mb-4",
                children: "Add an extra layer of security to your account"
              }), /* @__PURE__ */ jsxs("div", {
                className: "flex items-center justify-between py-3 px-4 bg-gray-50 rounded-md",
                children: [/* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("div", {
                    className: "text-sm font-medium text-gray-900",
                    children: "Authenticator App"
                  }), /* @__PURE__ */ jsx("div", {
                    className: "text-xs text-gray-500",
                    children: "Not enabled"
                  })]
                }), /* @__PURE__ */ jsx("button", {
                  className: "px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100",
                  children: "Enable"
                })]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "bg-white rounded-lg border border-gray-200 p-6",
              children: [/* @__PURE__ */ jsx("h2", {
                className: "text-lg font-semibold text-gray-900 mb-4",
                children: "Active Sessions"
              }), /* @__PURE__ */ jsxs("div", {
                className: "space-y-3",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "flex items-center justify-between py-3 px-4 bg-gray-50 rounded-md",
                  children: [/* @__PURE__ */ jsxs("div", {
                    children: [/* @__PURE__ */ jsx("div", {
                      className: "text-sm font-medium text-gray-900",
                      children: "MacBook Pro - Safari"
                    }), /* @__PURE__ */ jsx("div", {
                      className: "text-xs text-gray-500",
                      children: "San Francisco, CA • Current session"
                    })]
                  }), /* @__PURE__ */ jsx("span", {
                    className: "px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full",
                    children: "Current"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "flex items-center justify-between py-3 px-4 bg-gray-50 rounded-md",
                  children: [/* @__PURE__ */ jsxs("div", {
                    children: [/* @__PURE__ */ jsx("div", {
                      className: "text-sm font-medium text-gray-900",
                      children: "iPhone - Mobile Safari"
                    }), /* @__PURE__ */ jsx("div", {
                      className: "text-xs text-gray-500",
                      children: "San Francisco, CA • 2 hours ago"
                    })]
                  }), /* @__PURE__ */ jsx("button", {
                    className: "text-xs text-red-600 hover:text-red-800",
                    children: "Revoke"
                  })]
                })]
              })]
            })]
          }), activeTab === "notifications" && /* @__PURE__ */ jsxs("div", {
            className: "bg-white rounded-lg border border-gray-200 p-6",
            children: [/* @__PURE__ */ jsx("h2", {
              className: "text-lg font-semibold text-gray-900 mb-6",
              children: "Notification Preferences"
            }), /* @__PURE__ */ jsxs("div", {
              className: "space-y-6",
              children: [/* @__PURE__ */ jsxs("div", {
                children: [/* @__PURE__ */ jsx("h3", {
                  className: "text-sm font-medium text-gray-900 mb-3",
                  children: "Email Notifications"
                }), /* @__PURE__ */ jsx("div", {
                  className: "space-y-3",
                  children: [{
                    key: "emailNotifications",
                    label: "All email notifications",
                    description: "Receive email notifications for account activity"
                  }, {
                    key: "securityAlerts",
                    label: "Security alerts",
                    description: "Get notified about security-related events"
                  }, {
                    key: "productUpdates",
                    label: "Product updates",
                    description: "News about new features and improvements"
                  }, {
                    key: "marketingEmails",
                    label: "Marketing emails",
                    description: "Promotional content and special offers"
                  }, {
                    key: "weeklyReports",
                    label: "Weekly reports",
                    description: "Summary of your account activity"
                  }, {
                    key: "apiLimitWarnings",
                    label: "API limit warnings",
                    description: "Alerts when approaching usage limits"
                  }].map((setting) => /* @__PURE__ */ jsxs("div", {
                    className: "flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0",
                    children: [/* @__PURE__ */ jsxs("div", {
                      children: [/* @__PURE__ */ jsx("div", {
                        className: "text-sm font-medium text-gray-900",
                        children: setting.label
                      }), /* @__PURE__ */ jsx("div", {
                        className: "text-xs text-gray-500",
                        children: setting.description
                      })]
                    }), /* @__PURE__ */ jsx("button", {
                      onClick: () => handleNotificationChange(setting.key),
                      className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${notificationSettings[setting.key] ? "bg-blue-600" : "bg-gray-200"}`,
                      children: /* @__PURE__ */ jsx("span", {
                        className: `inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${notificationSettings[setting.key] ? "translate-x-5" : "translate-x-1"}`
                      })
                    })]
                  }, setting.key))
                })]
              }), /* @__PURE__ */ jsx("div", {
                className: "pt-4",
                children: /* @__PURE__ */ jsxs("button", {
                  className: "flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500",
                  children: [/* @__PURE__ */ jsx(Save, {
                    className: "w-4 h-4"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "Save preferences"
                  })]
                })
              })]
            })]
          }), activeTab === "billing" && /* @__PURE__ */ jsxs("div", {
            className: "space-y-6",
            children: [/* @__PURE__ */ jsxs("div", {
              className: "bg-white rounded-lg border border-gray-200 p-6",
              children: [/* @__PURE__ */ jsx("h2", {
                className: "text-lg font-semibold text-gray-900 mb-6",
                children: "Current Plan"
              }), /* @__PURE__ */ jsxs("div", {
                className: "flex items-center justify-between",
                children: [/* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("div", {
                    className: "text-2xl font-bold text-gray-900",
                    children: "Free Plan"
                  }), /* @__PURE__ */ jsx("div", {
                    className: "text-sm text-gray-500",
                    children: "10,000 API calls per month"
                  }), /* @__PURE__ */ jsx("div", {
                    className: "text-xs text-gray-400 mt-1",
                    children: "7,450 calls used this month"
                  })]
                }), /* @__PURE__ */ jsx("button", {
                  className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500",
                  children: "Upgrade Plan"
                })]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "bg-white rounded-lg border border-gray-200 p-6",
              children: [/* @__PURE__ */ jsx("h2", {
                className: "text-lg font-semibold text-gray-900 mb-4",
                children: "Payment Method"
              }), /* @__PURE__ */ jsx("p", {
                className: "text-sm text-gray-600 mb-4",
                children: "No payment method on file"
              }), /* @__PURE__ */ jsx("button", {
                className: "px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100",
                children: "Add payment method"
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "bg-white rounded-lg border border-gray-200 p-6",
              children: [/* @__PURE__ */ jsx("h2", {
                className: "text-lg font-semibold text-gray-900 mb-4",
                children: "Billing History"
              }), /* @__PURE__ */ jsxs("div", {
                className: "text-center py-8",
                children: [/* @__PURE__ */ jsx("div", {
                  className: "text-sm text-gray-500",
                  children: "No billing history available"
                }), /* @__PURE__ */ jsx("div", {
                  className: "text-xs text-gray-400 mt-1",
                  children: "Invoices will appear here when you upgrade to a paid plan"
                })]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "bg-white rounded-lg border border-red-200 p-6",
              children: [/* @__PURE__ */ jsx("h2", {
                className: "text-lg font-semibold text-red-900 mb-4",
                children: "Danger Zone"
              }), /* @__PURE__ */ jsx("div", {
                className: "space-y-4",
                children: /* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("h3", {
                    className: "text-sm font-medium text-gray-900 mb-1",
                    children: "Delete Account"
                  }), /* @__PURE__ */ jsx("p", {
                    className: "text-xs text-gray-500 mb-3",
                    children: "Once you delete your account, there is no going back. Please be certain."
                  }), /* @__PURE__ */ jsxs("button", {
                    className: "flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500",
                    children: [/* @__PURE__ */ jsx(Trash2, {
                      className: "w-4 h-4"
                    }), /* @__PURE__ */ jsx("span", {
                      children: "Delete account"
                    })]
                  })]
                })
              })]
            })]
          })]
        })]
      })]
    })
  });
});
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: settings
}, Symbol.toStringTag, { value: "Module" }));
const login = UNSAFE_withComponentProps(function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });
  const handleSubmit = async () => {
    console.log("handleSubmit called");
    setIsLoading(true);
    try {
      console.log("About to call authApi.login");
      const result = await authApi.login({
        email: formData.email,
        password: formData.password
      });
      console.log("Login successful:", result);
      toast.success("Login successful! Welcome back.");
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message || "Login failed. Please check your credentials.");
    } finally {
      console.log("Finally block reached");
      setIsLoading(false);
    }
  };
  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked
    } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };
  return /* @__PURE__ */ jsxs("div", {
    className: "min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8",
    children: [/* @__PURE__ */ jsxs("div", {
      className: "sm:mx-auto sm:w-full sm:max-w-md",
      children: [/* @__PURE__ */ jsx("div", {
        className: "flex justify-center",
        children: /* @__PURE__ */ jsx("div", {
          className: "w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center",
          children: /* @__PURE__ */ jsx(ChevronLeft, {
            className: "w-6 h-6 text-white"
          })
        })
      }), /* @__PURE__ */ jsx("h2", {
        className: "mt-6 text-center text-3xl font-bold text-gray-900",
        children: "Sign in to your account"
      }), /* @__PURE__ */ jsxs("p", {
        className: "mt-2 text-center text-sm text-gray-600",
        children: ["Or", " ", /* @__PURE__ */ jsx(Link, {
          to: "/register",
          className: "font-medium text-blue-600 hover:text-blue-500",
          children: "create a new account"
        })]
      })]
    }), /* @__PURE__ */ jsx("div", {
      className: "mt-8 sm:mx-auto sm:w-full sm:max-w-md",
      children: /* @__PURE__ */ jsxs("div", {
        className: "bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "space-y-6",
          children: [/* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "email",
              className: "block text-sm font-medium text-gray-700",
              children: "Email address"
            }), /* @__PURE__ */ jsx("div", {
              className: "mt-1",
              children: /* @__PURE__ */ jsx("input", {
                id: "email",
                name: "email",
                type: "email",
                autoComplete: "email",
                required: true,
                value: formData.email,
                onChange: handleChange,
                onKeyDown: handleKeyDown,
                className: "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
                placeholder: "Enter your email"
              })
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "password",
              className: "block text-sm font-medium text-gray-700",
              children: "Password"
            }), /* @__PURE__ */ jsxs("div", {
              className: "mt-1 relative",
              children: [/* @__PURE__ */ jsx("input", {
                id: "password",
                name: "password",
                type: showPassword ? "text" : "password",
                autoComplete: "current-password",
                required: true,
                value: formData.password,
                onChange: handleChange,
                onKeyDown: handleKeyDown,
                className: "appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
                placeholder: "Enter your password"
              }), /* @__PURE__ */ jsx("button", {
                type: "button",
                className: "absolute inset-y-0 right-0 pr-3 flex items-center",
                onClick: () => setShowPassword(!showPassword),
                children: showPassword ? /* @__PURE__ */ jsx(EyeOff, {
                  className: "h-4 w-4 text-gray-400"
                }) : /* @__PURE__ */ jsx(Eye, {
                  className: "h-4 w-4 text-gray-400"
                })
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "flex items-center justify-between",
            children: [/* @__PURE__ */ jsxs("div", {
              className: "flex items-center",
              children: [/* @__PURE__ */ jsx("input", {
                id: "rememberMe",
                name: "rememberMe",
                type: "checkbox",
                checked: formData.rememberMe,
                onChange: handleChange,
                className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              }), /* @__PURE__ */ jsx("label", {
                htmlFor: "rememberMe",
                className: "ml-2 block text-sm text-gray-900",
                children: "Remember me"
              })]
            }), /* @__PURE__ */ jsx("div", {
              className: "text-sm",
              children: /* @__PURE__ */ jsx(Link, {
                to: "/forgot-password",
                className: "font-medium text-blue-600 hover:text-blue-500",
                children: "Forgot your password?"
              })
            })]
          }), /* @__PURE__ */ jsx("div", {
            children: /* @__PURE__ */ jsx("button", {
              type: "button",
              onClick: handleSubmit,
              disabled: isLoading,
              className: "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
              children: isLoading ? "Signing in..." : "Sign in"
            })
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "mt-6",
          children: [/* @__PURE__ */ jsxs("div", {
            className: "relative",
            children: [/* @__PURE__ */ jsx("div", {
              className: "absolute inset-0 flex items-center",
              children: /* @__PURE__ */ jsx("div", {
                className: "w-full border-t border-gray-300"
              })
            }), /* @__PURE__ */ jsx("div", {
              className: "relative flex justify-center text-sm",
              children: /* @__PURE__ */ jsx("span", {
                className: "px-2 bg-white text-gray-500",
                children: "Or continue with"
              })
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "mt-6 grid grid-cols-2 gap-3",
            children: [/* @__PURE__ */ jsx("div", {
              children: /* @__PURE__ */ jsxs("button", {
                className: "w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50",
                children: [/* @__PURE__ */ jsxs("svg", {
                  className: "h-5 w-5",
                  fill: "currentColor",
                  viewBox: "0 0 24 24",
                  children: [/* @__PURE__ */ jsx("path", {
                    d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
                    fill: "#4285F4"
                  }), /* @__PURE__ */ jsx("path", {
                    d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
                    fill: "#34A853"
                  }), /* @__PURE__ */ jsx("path", {
                    d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
                    fill: "#FBBC05"
                  }), /* @__PURE__ */ jsx("path", {
                    d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
                    fill: "#EA4335"
                  })]
                }), /* @__PURE__ */ jsx("span", {
                  className: "ml-2",
                  children: "Google"
                })]
              })
            }), /* @__PURE__ */ jsx("div", {
              children: /* @__PURE__ */ jsxs("button", {
                className: "w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50",
                children: [/* @__PURE__ */ jsx("svg", {
                  className: "h-5 w-5",
                  fill: "currentColor",
                  viewBox: "0 0 24 24",
                  children: /* @__PURE__ */ jsx("path", {
                    d: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.111.221.082.341-.09.381-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"
                  })
                }), /* @__PURE__ */ jsx("span", {
                  className: "ml-2",
                  children: "GitHub"
                })]
              })
            })]
          })]
        })]
      })
    }), /* @__PURE__ */ jsx("div", {
      className: "mt-8 text-center",
      children: /* @__PURE__ */ jsxs("p", {
        className: "text-xs text-gray-500",
        children: ["By signing in, you agree to our", " ", /* @__PURE__ */ jsx("a", {
          href: "#",
          className: "text-blue-600 hover:text-blue-500",
          children: "Terms of Service"
        }), " ", "and", " ", /* @__PURE__ */ jsx("a", {
          href: "#",
          className: "text-blue-600 hover:text-blue-500",
          children: "Privacy Policy"
        })]
      })
    })]
  });
});
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: login
}, Symbol.toStringTag, { value: "Module" }));
const register = UNSAFE_withComponentProps(function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    company: "",
    agreeToTerms: false,
    subscribeToUpdates: false
  });
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!formData.agreeToTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.register({
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        password: formData.password
      });
      toast.success("Registration successful! Please check your email to verify your account.");
      navigate("/login");
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked
    } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    if (name === "password") {
      setPasswordRequirements({
        minLength: value.length >= 8,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasNumber: /\d/.test(value),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(value)
      });
    }
  };
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== "";
  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
  return /* @__PURE__ */ jsxs("div", {
    className: "min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8",
    children: [/* @__PURE__ */ jsxs("div", {
      className: "sm:mx-auto sm:w-full sm:max-w-md",
      children: [/* @__PURE__ */ jsx("div", {
        className: "flex justify-center",
        children: /* @__PURE__ */ jsx("div", {
          className: "w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center",
          children: /* @__PURE__ */ jsx(ChevronLeft, {
            className: "w-6 h-6 text-white"
          })
        })
      }), /* @__PURE__ */ jsx("h2", {
        className: "mt-6 text-center text-3xl font-bold text-gray-900",
        children: "Create your account"
      }), /* @__PURE__ */ jsxs("p", {
        className: "mt-2 text-center text-sm text-gray-600",
        children: ["Already have an account?", " ", /* @__PURE__ */ jsx(Link, {
          to: "/login",
          className: "font-medium text-blue-600 hover:text-blue-500",
          children: "Sign in here"
        })]
      })]
    }), /* @__PURE__ */ jsx("div", {
      className: "mt-8 sm:mx-auto sm:w-full sm:max-w-md",
      children: /* @__PURE__ */ jsxs("div", {
        className: "bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10",
        children: [/* @__PURE__ */ jsxs("form", {
          className: "space-y-6",
          onSubmit: handleSubmit,
          children: [/* @__PURE__ */ jsxs("div", {
            className: "grid grid-cols-2 gap-4",
            children: [/* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("label", {
                htmlFor: "firstName",
                className: "block text-sm font-medium text-gray-700",
                children: "First name"
              }), /* @__PURE__ */ jsx("div", {
                className: "mt-1",
                children: /* @__PURE__ */ jsx("input", {
                  id: "firstName",
                  name: "firstName",
                  type: "text",
                  required: true,
                  value: formData.firstName,
                  onChange: handleChange,
                  className: "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
                  placeholder: "First name"
                })
              })]
            }), /* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("label", {
                htmlFor: "lastName",
                className: "block text-sm font-medium text-gray-700",
                children: "Last name"
              }), /* @__PURE__ */ jsx("div", {
                className: "mt-1",
                children: /* @__PURE__ */ jsx("input", {
                  id: "lastName",
                  name: "lastName",
                  type: "text",
                  required: true,
                  value: formData.lastName,
                  onChange: handleChange,
                  className: "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
                  placeholder: "Last name"
                })
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "email",
              className: "block text-sm font-medium text-gray-700",
              children: "Email address"
            }), /* @__PURE__ */ jsx("div", {
              className: "mt-1",
              children: /* @__PURE__ */ jsx("input", {
                id: "email",
                name: "email",
                type: "email",
                autoComplete: "email",
                required: true,
                value: formData.email,
                onChange: handleChange,
                className: "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
                placeholder: "Enter your email"
              })
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "company",
              className: "block text-sm font-medium text-gray-700",
              children: "Company (optional)"
            }), /* @__PURE__ */ jsx("div", {
              className: "mt-1",
              children: /* @__PURE__ */ jsx("input", {
                id: "company",
                name: "company",
                type: "text",
                value: formData.company,
                onChange: handleChange,
                className: "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
                placeholder: "Your company name"
              })
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "password",
              className: "block text-sm font-medium text-gray-700",
              children: "Password"
            }), /* @__PURE__ */ jsxs("div", {
              className: "mt-1 relative",
              children: [/* @__PURE__ */ jsx("input", {
                id: "password",
                name: "password",
                type: showPassword ? "text" : "password",
                required: true,
                value: formData.password,
                onChange: handleChange,
                className: "appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
                placeholder: "Create a password"
              }), /* @__PURE__ */ jsx("button", {
                type: "button",
                className: "absolute inset-y-0 right-0 pr-3 flex items-center",
                onClick: () => setShowPassword(!showPassword),
                children: showPassword ? /* @__PURE__ */ jsx(EyeOff, {
                  className: "h-4 w-4 text-gray-400"
                }) : /* @__PURE__ */ jsx(Eye, {
                  className: "h-4 w-4 text-gray-400"
                })
              })]
            }), formData.password && /* @__PURE__ */ jsxs("div", {
              className: "mt-2 space-y-1",
              children: [/* @__PURE__ */ jsx("div", {
                className: "text-xs text-gray-600",
                children: "Password must contain:"
              }), /* @__PURE__ */ jsxs("div", {
                className: "grid grid-cols-2 gap-1 text-xs",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: `flex items-center space-x-1 ${passwordRequirements.minLength ? "text-green-600" : "text-gray-400"}`,
                  children: [/* @__PURE__ */ jsx(Check, {
                    className: "w-3 h-3"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "8+ characters"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: `flex items-center space-x-1 ${passwordRequirements.hasUppercase ? "text-green-600" : "text-gray-400"}`,
                  children: [/* @__PURE__ */ jsx(Check, {
                    className: "w-3 h-3"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "Uppercase"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: `flex items-center space-x-1 ${passwordRequirements.hasLowercase ? "text-green-600" : "text-gray-400"}`,
                  children: [/* @__PURE__ */ jsx(Check, {
                    className: "w-3 h-3"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "Lowercase"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: `flex items-center space-x-1 ${passwordRequirements.hasNumber ? "text-green-600" : "text-gray-400"}`,
                  children: [/* @__PURE__ */ jsx(Check, {
                    className: "w-3 h-3"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "Number"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: `flex items-center space-x-1 ${passwordRequirements.hasSpecialChar ? "text-green-600" : "text-gray-400"} col-span-2`,
                  children: [/* @__PURE__ */ jsx(Check, {
                    className: "w-3 h-3"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "Special character"
                  })]
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "confirmPassword",
              className: "block text-sm font-medium text-gray-700",
              children: "Confirm password"
            }), /* @__PURE__ */ jsxs("div", {
              className: "mt-1 relative",
              children: [/* @__PURE__ */ jsx("input", {
                id: "confirmPassword",
                name: "confirmPassword",
                type: showConfirmPassword ? "text" : "password",
                required: true,
                value: formData.confirmPassword,
                onChange: handleChange,
                className: `appearance-none block w-full px-3 py-2 pr-10 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 sm:text-sm ${formData.confirmPassword && !passwordsMatch ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"}`,
                placeholder: "Confirm your password"
              }), /* @__PURE__ */ jsx("button", {
                type: "button",
                className: "absolute inset-y-0 right-0 pr-3 flex items-center",
                onClick: () => setShowConfirmPassword(!showConfirmPassword),
                children: showConfirmPassword ? /* @__PURE__ */ jsx(EyeOff, {
                  className: "h-4 w-4 text-gray-400"
                }) : /* @__PURE__ */ jsx(Eye, {
                  className: "h-4 w-4 text-gray-400"
                })
              })]
            }), formData.confirmPassword && !passwordsMatch && /* @__PURE__ */ jsx("p", {
              className: "mt-1 text-xs text-red-600",
              children: "Passwords do not match"
            }), passwordsMatch && /* @__PURE__ */ jsx("p", {
              className: "mt-1 text-xs text-green-600",
              children: "Passwords match"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "space-y-3",
            children: [/* @__PURE__ */ jsxs("div", {
              className: "flex items-center",
              children: [/* @__PURE__ */ jsx("input", {
                id: "agreeToTerms",
                name: "agreeToTerms",
                type: "checkbox",
                checked: formData.agreeToTerms,
                onChange: handleChange,
                required: true,
                className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              }), /* @__PURE__ */ jsxs("label", {
                htmlFor: "agreeToTerms",
                className: "ml-2 block text-sm text-gray-900",
                children: ["I agree to the", " ", /* @__PURE__ */ jsx("a", {
                  href: "#",
                  className: "text-blue-600 hover:text-blue-500",
                  children: "Terms of Service"
                }), " ", "and", " ", /* @__PURE__ */ jsx("a", {
                  href: "#",
                  className: "text-blue-600 hover:text-blue-500",
                  children: "Privacy Policy"
                })]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "flex items-center",
              children: [/* @__PURE__ */ jsx("input", {
                id: "subscribeToUpdates",
                name: "subscribeToUpdates",
                type: "checkbox",
                checked: formData.subscribeToUpdates,
                onChange: handleChange,
                className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              }), /* @__PURE__ */ jsx("label", {
                htmlFor: "subscribeToUpdates",
                className: "ml-2 block text-sm text-gray-900",
                children: "Subscribe to product updates and newsletters"
              })]
            })]
          }), /* @__PURE__ */ jsx("div", {
            children: /* @__PURE__ */ jsx("button", {
              type: "submit",
              disabled: !allRequirementsMet || !passwordsMatch || !formData.agreeToTerms,
              className: "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed",
              children: "Create account"
            })
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "mt-6",
          children: [/* @__PURE__ */ jsxs("div", {
            className: "relative",
            children: [/* @__PURE__ */ jsx("div", {
              className: "absolute inset-0 flex items-center",
              children: /* @__PURE__ */ jsx("div", {
                className: "w-full border-t border-gray-300"
              })
            }), /* @__PURE__ */ jsx("div", {
              className: "relative flex justify-center text-sm",
              children: /* @__PURE__ */ jsx("span", {
                className: "px-2 bg-white text-gray-500",
                children: "Or sign up with"
              })
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "mt-6 grid grid-cols-2 gap-3",
            children: [/* @__PURE__ */ jsx("div", {
              children: /* @__PURE__ */ jsxs("button", {
                className: "w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50",
                children: [/* @__PURE__ */ jsxs("svg", {
                  className: "h-5 w-5",
                  fill: "currentColor",
                  viewBox: "0 0 24 24",
                  children: [/* @__PURE__ */ jsx("path", {
                    d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
                    fill: "#4285F4"
                  }), /* @__PURE__ */ jsx("path", {
                    d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
                    fill: "#34A853"
                  }), /* @__PURE__ */ jsx("path", {
                    d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
                    fill: "#FBBC05"
                  }), /* @__PURE__ */ jsx("path", {
                    d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
                    fill: "#EA4335"
                  })]
                }), /* @__PURE__ */ jsx("span", {
                  className: "ml-2",
                  children: "Google"
                })]
              })
            }), /* @__PURE__ */ jsx("div", {
              children: /* @__PURE__ */ jsxs("button", {
                className: "w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50",
                children: [/* @__PURE__ */ jsx("svg", {
                  className: "h-5 w-5",
                  fill: "currentColor",
                  viewBox: "0 0 24 24",
                  children: /* @__PURE__ */ jsx("path", {
                    d: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.111.221.082.341-.09.381-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"
                  })
                }), /* @__PURE__ */ jsx("span", {
                  className: "ml-2",
                  children: "GitHub"
                })]
              })
            })]
          })]
        })]
      })
    })]
  });
});
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: register
}, Symbol.toStringTag, { value: "Module" }));
const forgotPassword = UNSAFE_withComponentProps(function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 2e3);
  };
  if (isSubmitted) {
    return /* @__PURE__ */ jsx("div", {
      className: "min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8",
      children: /* @__PURE__ */ jsx("div", {
        className: "sm:mx-auto sm:w-full sm:max-w-md",
        children: /* @__PURE__ */ jsx("div", {
          className: "bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10",
          children: /* @__PURE__ */ jsxs("div", {
            className: "text-center",
            children: [/* @__PURE__ */ jsx("div", {
              className: "mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4",
              children: /* @__PURE__ */ jsx(Mail, {
                className: "h-6 w-6 text-green-600"
              })
            }), /* @__PURE__ */ jsx("h2", {
              className: "text-2xl font-bold text-gray-900 mb-2",
              children: "Check your email"
            }), /* @__PURE__ */ jsxs("p", {
              className: "text-sm text-gray-600 mb-6",
              children: ["We've sent a password reset link to ", /* @__PURE__ */ jsx("strong", {
                children: email
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "space-y-4",
              children: [/* @__PURE__ */ jsx("p", {
                className: "text-xs text-gray-500",
                children: "Didn't receive the email? Check your spam folder or try again."
              }), /* @__PURE__ */ jsx("button", {
                onClick: () => setIsSubmitted(false),
                className: "w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                children: "Try a different email"
              }), /* @__PURE__ */ jsx(Link, {
                to: "/login",
                className: "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                children: "Back to sign in"
              })]
            })]
          })
        })
      })
    });
  }
  return /* @__PURE__ */ jsxs("div", {
    className: "min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8",
    children: [/* @__PURE__ */ jsxs("div", {
      className: "sm:mx-auto sm:w-full sm:max-w-md",
      children: [/* @__PURE__ */ jsx("div", {
        className: "flex justify-center",
        children: /* @__PURE__ */ jsx("div", {
          className: "w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center",
          children: /* @__PURE__ */ jsx(ChevronLeft, {
            className: "w-6 h-6 text-white"
          })
        })
      }), /* @__PURE__ */ jsx("h2", {
        className: "mt-6 text-center text-3xl font-bold text-gray-900",
        children: "Forgot your password?"
      }), /* @__PURE__ */ jsx("p", {
        className: "mt-2 text-center text-sm text-gray-600",
        children: "No worries, we'll send you reset instructions."
      })]
    }), /* @__PURE__ */ jsx("div", {
      className: "mt-8 sm:mx-auto sm:w-full sm:max-w-md",
      children: /* @__PURE__ */ jsxs("div", {
        className: "bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10",
        children: [/* @__PURE__ */ jsxs("form", {
          className: "space-y-6",
          onSubmit: handleSubmit,
          children: [/* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "email",
              className: "block text-sm font-medium text-gray-700",
              children: "Email address"
            }), /* @__PURE__ */ jsx("div", {
              className: "mt-1",
              children: /* @__PURE__ */ jsx("input", {
                id: "email",
                name: "email",
                type: "email",
                autoComplete: "email",
                required: true,
                value: email,
                onChange: (e) => setEmail(e.target.value),
                className: "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
                placeholder: "Enter your email address"
              })
            }), /* @__PURE__ */ jsx("p", {
              className: "mt-2 text-xs text-gray-500",
              children: "We'll send a password reset link to this email address."
            })]
          }), /* @__PURE__ */ jsx("div", {
            children: /* @__PURE__ */ jsx("button", {
              type: "submit",
              disabled: isLoading || !email,
              className: "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed",
              children: isLoading ? /* @__PURE__ */ jsxs("div", {
                className: "flex items-center space-x-2",
                children: [/* @__PURE__ */ jsx("div", {
                  className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                }), /* @__PURE__ */ jsx("span", {
                  children: "Sending..."
                })]
              }) : "Send reset instructions"
            })
          }), /* @__PURE__ */ jsx("div", {
            className: "text-center",
            children: /* @__PURE__ */ jsxs(Link, {
              to: "/login",
              className: "inline-flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-500",
              children: [/* @__PURE__ */ jsx(ArrowLeft, {
                className: "w-4 h-4"
              }), /* @__PURE__ */ jsx("span", {
                children: "Back to sign in"
              })]
            })
          })]
        }), /* @__PURE__ */ jsx("div", {
          className: "mt-6 pt-6 border-t border-gray-200",
          children: /* @__PURE__ */ jsxs("div", {
            className: "text-center",
            children: [/* @__PURE__ */ jsx("h3", {
              className: "text-sm font-medium text-gray-900 mb-2",
              children: "Still having trouble?"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-xs text-gray-500 mb-3",
              children: "If you don't receive an email within a few minutes, please check your spam folder or contact support."
            }), /* @__PURE__ */ jsx("a", {
              href: "mailto:support@kuttl.xyz",
              className: "text-xs text-blue-600 hover:text-blue-500",
              children: "Contact Support"
            })]
          })
        })]
      })
    }), /* @__PURE__ */ jsx("div", {
      className: "mt-8 text-center",
      children: /* @__PURE__ */ jsxs("p", {
        className: "text-xs text-gray-500",
        children: ["Remember your password?", " ", /* @__PURE__ */ jsx(Link, {
          to: "/login",
          className: "text-blue-600 hover:text-blue-500",
          children: "Sign in"
        })]
      })
    })]
  });
});
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: forgotPassword
}, Symbol.toStringTag, { value: "Module" }));
const resetPassword = UNSAFE_withComponentProps(function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
    }
  }, [token]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 2e3);
  };
  const handleChange = (e) => {
    const {
      name,
      value
    } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (name === "password") {
      setPasswordRequirements({
        minLength: value.length >= 8,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasNumber: /\d/.test(value),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(value)
      });
    }
  };
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== "";
  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
  if (!tokenValid) {
    return /* @__PURE__ */ jsx("div", {
      className: "min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8",
      children: /* @__PURE__ */ jsx("div", {
        className: "sm:mx-auto sm:w-full sm:max-w-md",
        children: /* @__PURE__ */ jsx("div", {
          className: "bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10",
          children: /* @__PURE__ */ jsxs("div", {
            className: "text-center",
            children: [/* @__PURE__ */ jsx("div", {
              className: "mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4",
              children: /* @__PURE__ */ jsx("svg", {
                className: "h-6 w-6 text-red-600",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                children: /* @__PURE__ */ jsx("path", {
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  strokeWidth: 2,
                  d: "M6 18L18 6M6 6l12 12"
                })
              })
            }), /* @__PURE__ */ jsx("h2", {
              className: "text-2xl font-bold text-gray-900 mb-2",
              children: "Invalid Reset Link"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-sm text-gray-600 mb-6",
              children: "This password reset link is invalid or has expired. Please request a new one."
            }), /* @__PURE__ */ jsxs("div", {
              className: "space-y-3",
              children: [/* @__PURE__ */ jsx(Link, {
                to: "/forgot-password",
                className: "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                children: "Request new reset link"
              }), /* @__PURE__ */ jsx(Link, {
                to: "/login",
                className: "w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                children: "Back to sign in"
              })]
            })]
          })
        })
      })
    });
  }
  if (isSubmitted) {
    return /* @__PURE__ */ jsx("div", {
      className: "min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8",
      children: /* @__PURE__ */ jsx("div", {
        className: "sm:mx-auto sm:w-full sm:max-w-md",
        children: /* @__PURE__ */ jsx("div", {
          className: "bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10",
          children: /* @__PURE__ */ jsxs("div", {
            className: "text-center",
            children: [/* @__PURE__ */ jsx("div", {
              className: "mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4",
              children: /* @__PURE__ */ jsx(Check, {
                className: "h-6 w-6 text-green-600"
              })
            }), /* @__PURE__ */ jsx("h2", {
              className: "text-2xl font-bold text-gray-900 mb-2",
              children: "Password updated"
            }), /* @__PURE__ */ jsx("p", {
              className: "text-sm text-gray-600 mb-6",
              children: "Your password has been successfully updated. You can now sign in with your new password."
            }), /* @__PURE__ */ jsx(Link, {
              to: "/login",
              className: "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              children: "Sign in to your account"
            })]
          })
        })
      })
    });
  }
  return /* @__PURE__ */ jsxs("div", {
    className: "min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8",
    children: [/* @__PURE__ */ jsxs("div", {
      className: "sm:mx-auto sm:w-full sm:max-w-md",
      children: [/* @__PURE__ */ jsx("div", {
        className: "flex justify-center",
        children: /* @__PURE__ */ jsx("div", {
          className: "w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center",
          children: /* @__PURE__ */ jsx(ChevronLeft, {
            className: "w-6 h-6 text-white"
          })
        })
      }), /* @__PURE__ */ jsx("h2", {
        className: "mt-6 text-center text-3xl font-bold text-gray-900",
        children: "Reset your password"
      }), /* @__PURE__ */ jsx("p", {
        className: "mt-2 text-center text-sm text-gray-600",
        children: email ? `for ${email}` : "Enter your new password below"
      })]
    }), /* @__PURE__ */ jsx("div", {
      className: "mt-8 sm:mx-auto sm:w-full sm:max-w-md",
      children: /* @__PURE__ */ jsx("div", {
        className: "bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10",
        children: /* @__PURE__ */ jsxs("form", {
          className: "space-y-6",
          onSubmit: handleSubmit,
          children: [/* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "password",
              className: "block text-sm font-medium text-gray-700",
              children: "New password"
            }), /* @__PURE__ */ jsxs("div", {
              className: "mt-1 relative",
              children: [/* @__PURE__ */ jsx("input", {
                id: "password",
                name: "password",
                type: showPassword ? "text" : "password",
                required: true,
                value: formData.password,
                onChange: handleChange,
                className: "appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
                placeholder: "Enter your new password"
              }), /* @__PURE__ */ jsx("button", {
                type: "button",
                className: "absolute inset-y-0 right-0 pr-3 flex items-center",
                onClick: () => setShowPassword(!showPassword),
                children: showPassword ? /* @__PURE__ */ jsx(EyeOff, {
                  className: "h-4 w-4 text-gray-400"
                }) : /* @__PURE__ */ jsx(Eye, {
                  className: "h-4 w-4 text-gray-400"
                })
              })]
            }), formData.password && /* @__PURE__ */ jsxs("div", {
              className: "mt-2 space-y-1",
              children: [/* @__PURE__ */ jsx("div", {
                className: "text-xs text-gray-600",
                children: "Password must contain:"
              }), /* @__PURE__ */ jsxs("div", {
                className: "grid grid-cols-2 gap-1 text-xs",
                children: [/* @__PURE__ */ jsxs("div", {
                  className: `flex items-center space-x-1 ${passwordRequirements.minLength ? "text-green-600" : "text-gray-400"}`,
                  children: [/* @__PURE__ */ jsx(Check, {
                    className: "w-3 h-3"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "8+ characters"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: `flex items-center space-x-1 ${passwordRequirements.hasUppercase ? "text-green-600" : "text-gray-400"}`,
                  children: [/* @__PURE__ */ jsx(Check, {
                    className: "w-3 h-3"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "Uppercase"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: `flex items-center space-x-1 ${passwordRequirements.hasLowercase ? "text-green-600" : "text-gray-400"}`,
                  children: [/* @__PURE__ */ jsx(Check, {
                    className: "w-3 h-3"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "Lowercase"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: `flex items-center space-x-1 ${passwordRequirements.hasNumber ? "text-green-600" : "text-gray-400"}`,
                  children: [/* @__PURE__ */ jsx(Check, {
                    className: "w-3 h-3"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "Number"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: `flex items-center space-x-1 ${passwordRequirements.hasSpecialChar ? "text-green-600" : "text-gray-400"} col-span-2`,
                  children: [/* @__PURE__ */ jsx(Check, {
                    className: "w-3 h-3"
                  }), /* @__PURE__ */ jsx("span", {
                    children: "Special character"
                  })]
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              htmlFor: "confirmPassword",
              className: "block text-sm font-medium text-gray-700",
              children: "Confirm new password"
            }), /* @__PURE__ */ jsxs("div", {
              className: "mt-1 relative",
              children: [/* @__PURE__ */ jsx("input", {
                id: "confirmPassword",
                name: "confirmPassword",
                type: showConfirmPassword ? "text" : "password",
                required: true,
                value: formData.confirmPassword,
                onChange: handleChange,
                className: `appearance-none block w-full px-3 py-2 pr-10 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 sm:text-sm ${formData.confirmPassword && !passwordsMatch ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"}`,
                placeholder: "Confirm your new password"
              }), /* @__PURE__ */ jsx("button", {
                type: "button",
                className: "absolute inset-y-0 right-0 pr-3 flex items-center",
                onClick: () => setShowConfirmPassword(!showConfirmPassword),
                children: showConfirmPassword ? /* @__PURE__ */ jsx(EyeOff, {
                  className: "h-4 w-4 text-gray-400"
                }) : /* @__PURE__ */ jsx(Eye, {
                  className: "h-4 w-4 text-gray-400"
                })
              })]
            }), formData.confirmPassword && !passwordsMatch && /* @__PURE__ */ jsx("p", {
              className: "mt-1 text-xs text-red-600",
              children: "Passwords do not match"
            }), passwordsMatch && /* @__PURE__ */ jsx("p", {
              className: "mt-1 text-xs text-green-600",
              children: "Passwords match"
            })]
          }), /* @__PURE__ */ jsx("div", {
            children: /* @__PURE__ */ jsx("button", {
              type: "submit",
              disabled: isLoading || !allRequirementsMet || !passwordsMatch,
              className: "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed",
              children: isLoading ? /* @__PURE__ */ jsxs("div", {
                className: "flex items-center space-x-2",
                children: [/* @__PURE__ */ jsx("div", {
                  className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                }), /* @__PURE__ */ jsx("span", {
                  children: "Updating..."
                })]
              }) : "Update password"
            })
          }), /* @__PURE__ */ jsx("div", {
            className: "text-center",
            children: /* @__PURE__ */ jsxs(Link, {
              to: "/login",
              className: "inline-flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-500",
              children: [/* @__PURE__ */ jsx(ArrowLeft, {
                className: "w-4 h-4"
              }), /* @__PURE__ */ jsx("span", {
                children: "Back to sign in"
              })]
            })
          })]
        })
      })
    }), /* @__PURE__ */ jsx("div", {
      className: "mt-8 text-center",
      children: /* @__PURE__ */ jsxs("p", {
        className: "text-xs text-gray-500",
        children: ["Need help? Contact", " ", /* @__PURE__ */ jsx("a", {
          href: "mailto:support@kuttl.xyz",
          className: "text-blue-600 hover:text-blue-500",
          children: "support@kuttl.xyz"
        })]
      })
    })]
  });
});
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: resetPassword
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-QQR3PXqF.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/index-Bmi0sycR.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": true, "module": "/assets/root-Dwlj5kEw.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/index-Bmi0sycR.js", "/assets/index-i0T3QI9t.js", "/assets/utils-BQHNewu7.js"], "css": ["/assets/root-tGV9a2e0.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/home": { "id": "routes/home", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/home-DcOpv4U-.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/dashboard-layout-Ct1xDhEX.js", "/assets/utils-BQHNewu7.js", "/assets/api-aEKs-k91.js", "/assets/chevron-left-BHNl6aCQ.js", "/assets/funnel-BrWQXGyd.js", "/assets/AreaChart-CL1lmHty.js", "/assets/auth-wrapper-D9gcItuR.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/accounts": { "id": "routes/accounts", "parentId": "root", "path": "accounts", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/accounts-T2VjEjAY.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/dashboard-layout-Ct1xDhEX.js", "/assets/plus-DB-y6Aae.js", "/assets/search-CZjpDzrB.js", "/assets/funnel-BrWQXGyd.js", "/assets/utils-BQHNewu7.js", "/assets/api-aEKs-k91.js", "/assets/chevron-left-BHNl6aCQ.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/ui-layers": { "id": "routes/ui-layers", "parentId": "root", "path": "ui-layers", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/ui-layers-B-ch-r_P.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/dashboard-layout-Ct1xDhEX.js", "/assets/plus-DB-y6Aae.js", "/assets/search-CZjpDzrB.js", "/assets/funnel-BrWQXGyd.js", "/assets/eye-DyYaMh_e.js", "/assets/chevron-left-BHNl6aCQ.js", "/assets/utils-BQHNewu7.js", "/assets/api-aEKs-k91.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/customizations": { "id": "routes/customizations", "parentId": "root", "path": "customizations", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/customizations-Nclu2jVn.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/dashboard-layout-Ct1xDhEX.js", "/assets/plus-DB-y6Aae.js", "/assets/search-CZjpDzrB.js", "/assets/funnel-BrWQXGyd.js", "/assets/eye-DyYaMh_e.js", "/assets/chevron-left-BHNl6aCQ.js", "/assets/utils-BQHNewu7.js", "/assets/api-aEKs-k91.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api-usage": { "id": "routes/api-usage", "parentId": "root", "path": "api-usage", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/api-usage-CzbXOZu-.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/dashboard-layout-Ct1xDhEX.js", "/assets/chevron-left-BHNl6aCQ.js", "/assets/triangle-alert-Dw2AG8zo.js", "/assets/AreaChart-CL1lmHty.js", "/assets/utils-BQHNewu7.js", "/assets/api-aEKs-k91.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api-keys": { "id": "routes/api-keys", "parentId": "root", "path": "api-keys", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/api-keys-CimWqouI.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/index-Bmi0sycR.js", "/assets/dashboard-layout-Ct1xDhEX.js", "/assets/auth-wrapper-D9gcItuR.js", "/assets/api-aEKs-k91.js", "/assets/index-i0T3QI9t.js", "/assets/plus-DB-y6Aae.js", "/assets/trash-2-DyrOrRuQ.js", "/assets/utils-BQHNewu7.js", "/assets/chevron-left-BHNl6aCQ.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/changelog": { "id": "routes/changelog", "parentId": "root", "path": "changelog", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/changelog-B8H2LxLw.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/dashboard-layout-Ct1xDhEX.js", "/assets/triangle-alert-Dw2AG8zo.js", "/assets/chevron-left-BHNl6aCQ.js", "/assets/plus-DB-y6Aae.js", "/assets/utils-BQHNewu7.js", "/assets/api-aEKs-k91.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/settings": { "id": "routes/settings", "parentId": "root", "path": "settings", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/settings-vCymqxTk.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/dashboard-layout-Ct1xDhEX.js", "/assets/chevron-left-BHNl6aCQ.js", "/assets/eye-off-DoS_CnKz.js", "/assets/eye-DyYaMh_e.js", "/assets/check-hhdIjoPw.js", "/assets/trash-2-DyrOrRuQ.js", "/assets/utils-BQHNewu7.js", "/assets/api-aEKs-k91.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/login": { "id": "routes/login", "parentId": "root", "path": "login", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/login-DVGi0gHz.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/api-aEKs-k91.js", "/assets/index-i0T3QI9t.js", "/assets/chevron-left-BHNl6aCQ.js", "/assets/eye-off-DoS_CnKz.js", "/assets/eye-DyYaMh_e.js", "/assets/index-Bmi0sycR.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/register": { "id": "routes/register", "parentId": "root", "path": "register", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/register-fGgp8WuA.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/api-aEKs-k91.js", "/assets/index-i0T3QI9t.js", "/assets/chevron-left-BHNl6aCQ.js", "/assets/eye-off-DoS_CnKz.js", "/assets/eye-DyYaMh_e.js", "/assets/check-hhdIjoPw.js", "/assets/index-Bmi0sycR.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/forgot-password": { "id": "routes/forgot-password", "parentId": "root", "path": "forgot-password", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/forgot-password-BK_GPMEx.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/chevron-left-BHNl6aCQ.js", "/assets/arrow-left-B2IWgRqO.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/reset-password": { "id": "routes/reset-password", "parentId": "root", "path": "reset-password", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasErrorBoundary": false, "module": "/assets/reset-password-BMGRuz5a.js", "imports": ["/assets/chunk-EPOLDU6W-FqQHWOW9.js", "/assets/check-hhdIjoPw.js", "/assets/chevron-left-BHNl6aCQ.js", "/assets/eye-off-DoS_CnKz.js", "/assets/eye-DyYaMh_e.js", "/assets/arrow-left-B2IWgRqO.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-075191a8.js", "version": "075191a8", "sri": void 0 };
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "unstable_subResourceIntegrity": false, "unstable_trailingSlashAwareDataRequests": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = ["/"];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/home": {
    id: "routes/home",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route1
  },
  "routes/accounts": {
    id: "routes/accounts",
    parentId: "root",
    path: "accounts",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/ui-layers": {
    id: "routes/ui-layers",
    parentId: "root",
    path: "ui-layers",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/customizations": {
    id: "routes/customizations",
    parentId: "root",
    path: "customizations",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/api-usage": {
    id: "routes/api-usage",
    parentId: "root",
    path: "api-usage",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/api-keys": {
    id: "routes/api-keys",
    parentId: "root",
    path: "api-keys",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/changelog": {
    id: "routes/changelog",
    parentId: "root",
    path: "changelog",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/settings": {
    id: "routes/settings",
    parentId: "root",
    path: "settings",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/login": {
    id: "routes/login",
    parentId: "root",
    path: "login",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/register": {
    id: "routes/register",
    parentId: "root",
    path: "register",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/forgot-password": {
    id: "routes/forgot-password",
    parentId: "root",
    path: "forgot-password",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/reset-password": {
    id: "routes/reset-password",
    parentId: "root",
    path: "reset-password",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  }
};
const allowedActionOrigins = false;
export {
  allowedActionOrigins,
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
