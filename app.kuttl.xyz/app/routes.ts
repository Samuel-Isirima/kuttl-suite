import type { RouteConfig } from "@react-router/dev/routes";
import { index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("accounts", "routes/accounts.tsx"),
  route("ui-layers", "routes/ui-layers.tsx"), 
  route("customizations", "routes/customizations.tsx"),
  route("api-usage", "routes/api-usage.tsx"),
  route("api-keys", "routes/api-keys.tsx"),
  route("changelog", "routes/changelog.tsx"),
  route("settings", "routes/settings.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password", "routes/reset-password.tsx"),
] satisfies RouteConfig;