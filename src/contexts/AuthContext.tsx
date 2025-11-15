import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { detectRoleFromEmail } from "@/utils/authHelpers";

export type UserRole = "patient" | "doctor" | "admin";

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  signUp: (credentials: { 
    email: string; 
    password: string; 
    role?: UserRole;
    phone?: string;
    abhaId?: string;
    aadhaarNo?: string;
    abdmId?: string;
    hprId?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user and role from Supabase
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          // Try to get role from user metadata or database
          const userRole = session.user.user_metadata?.role as UserRole || 
                         session.user.user_metadata?.user_role as UserRole ||
                         "patient"; // Default to patient
          setRole(userRole);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const userRole = session.user.user_metadata?.role as UserRole || 
                        session.user.user_metadata?.user_role as UserRole ||
                        "patient";
        setRole(userRole);
      } else {
        setUser(null);
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (credentials: { email: string; password: string }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        // Try to get role from metadata, or detect from email, or default to patient
        const userRole = data.user.user_metadata?.role as UserRole || 
                        data.user.user_metadata?.user_role as UserRole ||
                        detectRoleFromEmail(credentials.email) ||
                        "patient";
        setRole(userRole);
        return { success: true };
      }

      return { success: false, error: "Sign in failed" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const signUp = async (credentials: { 
    email: string; 
    password: string; 
    role?: UserRole;
    phone?: string;
    abhaId?: string;
    aadhaarNo?: string;
    abdmId?: string;
    hprId?: string;
  }) => {
    try {
      // Detect role from email if not provided
      const detectedRole = credentials.role || 
        (credentials.email.includes("@hpr.abdm") ? "doctor" : "patient");
      
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            role: detectedRole,
            user_role: detectedRole,
            phone: credentials.phone,
            abha_id: credentials.abhaId,
            aadhaar_no: credentials.aadhaarNo,
            abdm_id: credentials.abdmId,
            hpr_id: credentials.hprId,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setRole(credentials.role || "patient");
        return { success: true };
      }

      return { success: false, error: "Sign up failed" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  const updateRole = async (newRole: UserRole) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          role: newRole,
          user_role: newRole,
        },
      });

      if (!error) {
        setRole(newRole);
      }
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

