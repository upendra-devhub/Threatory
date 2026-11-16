import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignInPage from "../src/app/signin/page";
import SignUpPage from "../src/app/signup/page";
import { LandingPageView } from "../src/features/landing/LandingPageView";
import { ProtectedRoute } from "../src/features/auth/ProtectedRoute";
import { AuthProvider } from "../src/features/auth/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = "/";
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

function renderWithAuth(ui: ReactNode, queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  );
}

describe("Auth Frontend Pages and Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("SignInPage", () => {
    it("renders sign in form elements and links", async () => {
      // Mock /api/auth/me returning 401
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      );

      renderWithAuth(<SignInPage />);

      expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute("href", "/signup");
    });

    it("displays validation error on empty fields", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      );

      renderWithAuth(<SignInPage />);

      const submitButton = screen.getByRole("button", { name: /^sign in$/i });
      await userEvent.click(submitButton);

      expect(await screen.findByText(/please enter your email address/i)).toBeInTheDocument();
    });

    it("submits valid credentials and redirects to dashboard", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("/api/auth/me")) {
          return new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/auth/signin")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                user: {
                  id: "user-123",
                  email: "test@example.com",
                  createdAt: "2026-11-16T00:00:00.000Z",
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not found", { status: 404 });
      });

      renderWithAuth(<SignInPage />);

      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password/i);

      await userEvent.type(emailInput, "test@example.com");
      await userEvent.type(passwordInput, "validpassword123");

      const submitButton = screen.getByRole("button", { name: /^sign in$/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("displays API error when sign in fails", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("/api/auth/me")) {
          return new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/auth/signin")) {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: "UNAUTHORIZED",
                message: "Incorrect email address or password.",
              },
            }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not found", { status: 404 });
      });

      renderWithAuth(<SignInPage />);

      await userEvent.type(screen.getByLabelText(/^email$/i), "wrong@example.com");
      await userEvent.type(screen.getByLabelText(/^password/i), "wrongpassword123");
      await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

      expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  describe("SignUpPage", () => {
    it("enforces minimum 10 characters password requirement", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      );

      renderWithAuth(<SignUpPage />);

      await userEvent.type(screen.getByLabelText(/^email$/i), "newuser@example.com");
      await userEvent.type(screen.getByLabelText(/^password/i), "short");
      await userEvent.click(screen.getByRole("button", { name: /create account/i }));

      expect(await screen.findByText(/password must be at least 10 characters/i)).toBeInTheDocument();
    });

    it("successfully creates account and redirects", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("/api/auth/me")) {
          return new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/auth/signup")) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                user: {
                  id: "user-456",
                  email: "newuser@example.com",
                  createdAt: "2026-11-16T00:00:00.000Z",
                },
              },
            }),
            { status: 201, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not found", { status: 404 });
      });

      renderWithAuth(<SignUpPage />);

      await userEvent.type(screen.getByLabelText(/^email$/i), "newuser@example.com");
      await userEvent.type(screen.getByLabelText(/^password/i), "a-very-strong-pass-10");
      await userEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard");
      });
    });
  });

  describe("LandingPageView", () => {
    it("renders headline, 3 capabilities, and how-it-works steps", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      );

      renderWithAuth(<LandingPageView />);

      expect(screen.getByText(/see what a link, a profile or a website/i)).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /check a link/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /review your privacy/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /audit your website/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /how it works/i })).toBeInTheDocument();

      const ctaLinks = screen.getAllByRole("link", { name: /create free account|get started/i });
      expect(ctaLinks.length).toBeGreaterThan(0);
      expect(ctaLinks[0]).toHaveAttribute("href", "/signup");
    });
  });

  describe("ProtectedRoute", () => {
    it("redirects unauthenticated user to /signin with next parameter", async () => {
      mockPathname = "/url-analyzer";
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      );

      renderWithAuth(
        <ProtectedRoute>
          <div data-testid="secret-content">Secret Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/signin?next=%2Furl-analyzer");
      });

      expect(screen.queryByTestId("secret-content")).not.toBeInTheDocument();
    });

    it("renders protected content when user is authenticated", async () => {
      mockPathname = "/dashboard";
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              user: {
                id: "user-123",
                email: "alice@example.com",
                createdAt: "2026-11-16T00:00:00.000Z",
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      renderWithAuth(
        <ProtectedRoute>
          <div data-testid="secret-content">Secret Protected Content</div>
        </ProtectedRoute>
      );

      expect(await screen.findByTestId("secret-content")).toBeInTheDocument();
    });
  });
});
