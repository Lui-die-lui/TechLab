import { test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => {
  const mockSign = vi.fn().mockResolvedValue("mock-jwt-token");
  const chain = {
    setProtectedHeader: vi.fn(),
    setExpirationTime: vi.fn(),
    setIssuedAt: vi.fn(),
    sign: mockSign,
  };
  chain.setProtectedHeader.mockReturnValue(chain);
  chain.setExpirationTime.mockReturnValue(chain);
  chain.setIssuedAt.mockReturnValue(chain);

  const MockSignJWT = vi.fn().mockImplementation(() => chain);

  const mockCookieSet = vi.fn();
  const mockCookies = vi.fn().mockResolvedValue({ set: mockCookieSet });

  return { mockSign, chain, MockSignJWT, mockCookieSet, mockCookies };
});

vi.mock("jose", () => ({
  SignJWT: mocks.MockSignJWT,
  jwtVerify: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.mockCookies,
}));

import { createSession } from "@/lib/auth";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockSign.mockResolvedValue("mock-jwt-token");
  mocks.chain.setProtectedHeader.mockReturnValue(mocks.chain);
  mocks.chain.setExpirationTime.mockReturnValue(mocks.chain);
  mocks.chain.setIssuedAt.mockReturnValue(mocks.chain);
  mocks.mockCookies.mockResolvedValue({ set: mocks.mockCookieSet });
});

test("createSession constructs JWT with userId and email in payload", async () => {
  await createSession("user-123", "test@example.com");

  const [[payload]] = mocks.MockSignJWT.mock.calls;
  expect(payload.userId).toBe("user-123");
  expect(payload.email).toBe("test@example.com");
});

test("createSession sets expiry ~7 days from now in the payload", async () => {
  const before = Date.now();
  await createSession("user-123", "test@example.com");
  const after = Date.now();

  const [[payload]] = mocks.MockSignJWT.mock.calls;
  const expiresAt = new Date(payload.expiresAt).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expiresAt).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession signs with HS256 algorithm", async () => {
  await createSession("user-123", "test@example.com");

  expect(mocks.chain.setProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
});

test("createSession sets JWT expiration to 7d", async () => {
  await createSession("user-123", "test@example.com");

  expect(mocks.chain.setExpirationTime).toHaveBeenCalledWith("7d");
});

test("createSession calls setIssuedAt", async () => {
  await createSession("user-123", "test@example.com");

  expect(mocks.chain.setIssuedAt).toHaveBeenCalled();
});

test("createSession stores the signed token in the auth-token cookie", async () => {
  await createSession("user-123", "test@example.com");

  const [name, value] = mocks.mockCookieSet.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(value).toBe("mock-jwt-token");
});

test("createSession sets cookie as httpOnly", async () => {
  await createSession("user-123", "test@example.com");

  const [, , options] = mocks.mockCookieSet.mock.calls[0];
  expect(options.httpOnly).toBe(true);
});

test("createSession sets cookie sameSite to lax and path to /", async () => {
  await createSession("user-123", "test@example.com");

  const [, , options] = mocks.mockCookieSet.mock.calls[0];
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession sets cookie secure=false outside production", async () => {
  const original = process.env.NODE_ENV;
  // jsdom sets NODE_ENV to "test"
  await createSession("user-123", "test@example.com");

  const [, , options] = mocks.mockCookieSet.mock.calls[0];
  expect(options.secure).toBe(false);
  // restore (read-only in Node but safe to reassign in vitest/jsdom)
  Object.defineProperty(process.env, "NODE_ENV", { value: original, writable: true });
});

test("createSession sets cookie secure=true in production", async () => {
  Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });

  await createSession("user-123", "test@example.com");

  const [, , options] = mocks.mockCookieSet.mock.calls[0];
  expect(options.secure).toBe(true);

  Object.defineProperty(process.env, "NODE_ENV", { value: "test", writable: true });
});

test("createSession sets cookie expires ~7 days from now", async () => {
  const before = Date.now();
  await createSession("user-123", "test@example.com");
  const after = Date.now();

  const [, , options] = mocks.mockCookieSet.mock.calls[0];
  const expires: Date = options.expires;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});
