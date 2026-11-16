"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { UserSafe, SignInRequest, SignUpRequest } from "@threatory/contracts";
import {
  getAuthMe,
  signIn as apiSignIn,
  signUp as apiSignUp,
  signOut as apiSignOut,
  deleteAccount as apiDeleteAccount,
  queryKeys,
} from "@/lib/api-client";

export interface AuthContextType {
  user: UserSafe | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: SignInRequest) => Promise<UserSafe>;
  signUp: (credentials: SignUpRequest) => Promise<UserSafe>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: user = null,
    isLoading,
    refetch,
  } = useQuery<UserSafe | null>({
    queryKey: queryKeys.authMe(),
    queryFn: () => getAuthMe(),
    retry: false,
    staleTime: 60_000,
  });

  const signIn = useCallback(
    async (credentials: SignInRequest): Promise<UserSafe> => {
      const loggedInUser = await apiSignIn(credentials);
      queryClient.setQueryData(queryKeys.authMe(), loggedInUser);
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary() });
      await queryClient.invalidateQueries({ queryKey: ["history"] });
      return loggedInUser;
    },
    [queryClient]
  );

  const signUp = useCallback(
    async (credentials: SignUpRequest): Promise<UserSafe> => {
      const newUser = await apiSignUp(credentials);
      queryClient.setQueryData(queryKeys.authMe(), newUser);
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary() });
      await queryClient.invalidateQueries({ queryKey: ["history"] });
      return newUser;
    },
    [queryClient]
  );

  const signOut = useCallback(async (): Promise<void> => {
    await apiSignOut();
    queryClient.setQueryData(queryKeys.authMe(), null);
    queryClient.clear();
    router.push("/signin");
  }, [queryClient, router]);

  const deleteAccount = useCallback(async (): Promise<void> => {
    await apiDeleteAccount();
    queryClient.setQueryData(queryKeys.authMe(), null);
    queryClient.clear();
    router.push("/");
  }, [queryClient, router]);

  const refetchUser = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    deleteAccount,
    refetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback for tests or contexts without an explicit AuthProvider
    return {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      signIn: async () => {
        throw new Error("AuthProvider required");
      },
      signUp: async () => {
        throw new Error("AuthProvider required");
      },
      signOut: async () => {},
      deleteAccount: async () => {},
      refetchUser: async () => {},
    };
  }
  return context;
}
