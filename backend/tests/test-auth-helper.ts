import request from "supertest";
import { Express } from "express";

export interface TestUserSession {
  userId: string;
  cookie: string;
  email: string;
}

export async function createAuthenticatedSession(
  app: Express,
  email = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`,
  password = "testpassword123"
): Promise<TestUserSession> {
  const res = await request(app)
    .post("/api/auth/signup")
    .send({ email, password });

  if (res.status !== 201) {
    throw new Error(`Failed to create test user: ${JSON.stringify(res.body)}`);
  }

  const rawCookie = res.headers["set-cookie"];
  const cookies = Array.isArray(rawCookie) ? rawCookie : [rawCookie];
  const sidCookie = cookies.find((c) => c && c.startsWith("sid="));

  if (!sidCookie) {
    throw new Error("Missing sid cookie in signup response");
  }

  return {
    userId: res.body.data.user.id,
    cookie: sidCookie,
    email,
  };
}
