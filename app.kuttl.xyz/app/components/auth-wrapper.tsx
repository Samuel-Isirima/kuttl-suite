import { useEffect } from "react";
import { useNavigate } from "react-router";
import { isAuthenticated, getStoredUser } from "../lib/api";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
      return;
    }

    // Optional: Check if user is verified
    const user = getStoredUser();
    if (user && !user.verified) {
      // Could redirect to email verification page
      console.warn("User email not verified");
    }
  }, [navigate]);

  // Don't render children if not authenticated
  if (!isAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}