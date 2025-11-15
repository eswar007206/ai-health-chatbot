/**
 * RequireAuth.tsx
 * Purpose: Route protection wrapper for authenticated/role-based access
 * 
 * Usage:
 * <RequireAuth allowedRoles={['patient']}>
 *   <PatientDoctorsPage />
 * </RequireAuth>
 */

import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";
import type { UserRole } from "@/contexts/AuthContext";

interface RequireAuthProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  fallback?: ReactNode;
}

/**
 * RequireAuth Component
 * 
 * If not authenticated → shows sign in prompt
 * If authenticated but wrong role → shows permission denied
 * Otherwise → renders children
 */
export function RequireAuth({
  children,
  allowedRoles,
  fallback,
}: RequireAuthProps) {
  const { isAuthenticated, role, isLoading } = useAuth();

  // Still loading auth state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return fallback || (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-600" />
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.location.href = "/"}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated but wrong role
  if (allowedRoles && !allowedRoles.includes(role!)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Current role: <span className="font-semibold">{role}</span>
            </p>
            <p className="text-sm text-slate-600">
              Required roles: <span className="font-semibold">{allowedRoles.join(", ")}</span>
            </p>
            <Button className="w-full" onClick={() => window.location.href = "/"}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authorized
  return <>{children}</>;
}
