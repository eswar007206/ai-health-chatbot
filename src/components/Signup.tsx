/**
 * Signup.tsx
 * Purpose: Role-aware signup form (Patient | Doctor)
 * 
 * Features:
 * - Role toggle (Patient/Doctor)
 * - Conditional fields based on role
 * - Client-side validation
 * - Email domain detection with mismatch warning
 * - localStorage persistence (no backend)
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  detectRoleFromEmail,
  getRoleLabel,
} from "@/utils/authHelpers";
import type { UserRole } from "@/contexts/AuthContext";

interface SignupProps {
  onSuccess?: () => void;
}

export function Signup({ onSuccess }: SignupProps) {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("patient");
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    abhaId: "",
    aadhaarNo: "",
    abdmId: "",
    hprId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check email domain and show warning if mismatch with selected role
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData((prev) => ({ ...prev, email }));

    if (email) {
      const detectedRole = detectRoleFromEmail(email);
      if (detectedRole !== selectedRole) {
        setEmailWarning(
          `Your email suggests you're a ${getRoleLabel(detectedRole)}, but you're signing up as a ${getRoleLabel(selectedRole)}`
        );
      } else {
        setEmailWarning(null);
      }
    } else {
      setEmailWarning(null);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phone) {
      newErrors.phone = "Phone is required";
    } else if (!isValidPhone(formData.phone)) {
      newErrors.phone = "Phone must be at least 10 digits";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (selectedRole === "doctor" && !formData.hprId) {
      newErrors.hprId = "HPR ID is required for doctors";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        role: selectedRole,
        phone: formData.phone || undefined,
        abhaId: formData.abhaId || undefined,
        aadhaarNo: formData.aadhaarNo || undefined,
        abdmId: formData.abdmId || undefined,
        hprId: formData.hprId || undefined,
      });

      if (result.success) {
        toast({
          title: "Success!",
          description: `Account created as ${getRoleLabel(selectedRole)}. You can now sign in.`,
        });

        // Reset form
        setFormData({
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          abhaId: "",
          aadhaarNo: "",
          abdmId: "",
          hprId: "",
        });
        setErrors({});

        onSuccess?.();
      } else {
        toast({
          title: "Sign up failed",
          description: result.error || "Please try again",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Sign up to get started</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">I am a:</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["patient", "doctor"] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role);
                    setEmailWarning(null);
                  }}
                  className={`relative rounded-lg border-2 p-4 text-center font-medium transition ${
                    selectedRole === role
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                  }`}
                >
                  {getRoleLabel(role as UserRole)}
                  {selectedRole === role && (
                    <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Email Warning */}
          {emailWarning && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                {emailWarning}. Please confirm if this is correct.
              </AlertDescription>
            </Alert>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={
                selectedRole === "patient"
                  ? "your@abdm.com (optional)"
                  : "your@hpr.abdm.com (optional)"
              }
              value={formData.email}
              onChange={handleEmailChange}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91-9876543210"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && (
              <p className="text-xs text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Patient-specific fields */}
          {selectedRole === "patient" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="abhaId" className="flex items-center gap-2">
                  ABHA ID
                  <Badge variant="outline" className="text-xs">
                    Optional
                  </Badge>
                </Label>
                <Input
                  id="abhaId"
                  placeholder="ABHA-1234-5678-90"
                  value={formData.abhaId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, abhaId: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aadhaarNo" className="flex items-center gap-2">
                  Aadhaar Number
                  <Badge variant="outline" className="text-xs">
                    Optional
                  </Badge>
                </Label>
                <Input
                  id="aadhaarNo"
                  placeholder="1234-5678-9012"
                  value={formData.aadhaarNo}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      aadhaarNo: e.target.value,
                    }))
                  }
                />
              </div>
            </>
          )}

          {/* Doctor-specific fields */}
          {selectedRole === "doctor" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="abdmId" className="flex items-center gap-2">
                  ABDM ID
                  <Badge variant="outline" className="text-xs">
                    Optional
                  </Badge>
                </Label>
                <Input
                  id="abdmId"
                  placeholder="ABDM-1234-5678"
                  value={formData.abdmId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, abdmId: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hprId">Health Care Professional ID (HPR)</Label>
                <Input
                  id="hprId"
                  placeholder="your-id@hpr.abdm or HPR number"
                  value={formData.hprId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, hprId: e.target.value }))
                  }
                  className={errors.hprId ? "border-red-500" : ""}
                />
                {errors.hprId && (
                  <p className="text-xs text-red-600">{errors.hprId}</p>
                )}
              </div>
            </>
          )}

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              className={errors.confirmPassword ? "border-red-500" : ""}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
