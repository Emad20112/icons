import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getAuthContext,
  isDevImpersonationEnabled,
} from "../../server/utils/supabaseClient";
import { dbStore } from "../../server/utils/mockStore";

/**
 * Minimal H3Event double: getAuthContext only ever reads headers and cookies,
 * so a plain object with those two accessors is sufficient and keeps this test
 * independent of the Nitro runtime.
 */
function createEvent(
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {},
) {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }

  // h3's getCookie() parses event.node.req.headers.cookie as a raw header
  // string, so serialize the cookie object exactly as a browser would.
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
  if (cookieHeader) {
    normalized.cookie = cookieHeader;
  }

  return {
    node: {
      req: {
        headers: normalized,
      },
      res: {},
    },
  } as any;
}

const ADMIN_ID = "a0000000-0000-0000-0000-000000000001";
const USER_ID = "u0000000-0000-0000-0000-000000000001";

describe("Authentication Boundary & Privilege Escalation Prevention", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFlag = process.env.NUXT_DEV_ALLOW_IMPERSONATION;

  beforeEach(() => {
    delete process.env.NUXT_DEV_ALLOW_IMPERSONATION;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalFlag === undefined) {
      delete process.env.NUXT_DEV_ALLOW_IMPERSONATION;
    } else {
      process.env.NUXT_DEV_ALLOW_IMPERSONATION = originalFlag;
    }
  });

  it("SECURITY: an unauthenticated request is anonymous, never an admin", async () => {
    const ctx = await getAuthContext(createEvent());
    expect(ctx.userId).toBeNull();
    expect(ctx.role).toBeNull();
    expect(ctx.user).toBeNull();
  });

  it("SECURITY: x-user-role header cannot elevate a client to ADMIN", async () => {
    const ctx = await getAuthContext(
      createEvent({ "x-user-role": "ADMIN", "x-user-id": USER_ID }),
    );
    // Impersonation is disabled by default, so the request stays anonymous
    // and must NOT receive the asserted ADMIN role.
    expect(ctx.role).not.toBe("ADMIN");
    expect(ctx.userId).toBeNull();
  });

  it("SECURITY: x-user-id alone does not authenticate when impersonation is off", async () => {
    const ctx = await getAuthContext(createEvent({ "x-user-id": ADMIN_ID }));
    expect(ctx.userId).toBeNull();
    expect(ctx.role).toBeNull();
  });

  it("SECURITY: role always comes from the stored profile, not from the request", async () => {
    process.env.NUXT_DEV_ALLOW_IMPERSONATION = "true";

    // Ask for the USER profile but assert ADMIN in the header.
    const ctx = await getAuthContext(
      createEvent({ "x-user-id": USER_ID, "x-user-role": "ADMIN" }),
    );

    expect(ctx.userId).toBe(USER_ID);
    // The stored role for this profile is USER; the asserted header is ignored.
    expect(ctx.role).toBe("USER");
    expect(ctx.role).not.toBe("ADMIN");
  });

  it("SECURITY: impersonation is ignored entirely in production", async () => {
    process.env.NUXT_DEV_ALLOW_IMPERSONATION = "true";
    process.env.NODE_ENV = "production";

    expect(isDevImpersonationEnabled()).toBe(false);

    const ctx = await getAuthContext(
      createEvent({ "x-user-id": ADMIN_ID, "x-user-role": "ADMIN" }),
    );
    expect(ctx.userId).toBeNull();
    expect(ctx.role).toBeNull();
  });

  it("SECURITY: dev impersonation requires an explicit opt-in flag", () => {
    delete process.env.NUXT_DEV_ALLOW_IMPERSONATION;
    process.env.NODE_ENV = "development";
    expect(isDevImpersonationEnabled()).toBe(false);

    process.env.NUXT_DEV_ALLOW_IMPERSONATION = "true";
    expect(isDevImpersonationEnabled()).toBe(true);

    process.env.NUXT_DEV_ALLOW_IMPERSONATION = "false";
    expect(isDevImpersonationEnabled()).toBe(false);
  });

  it("SESSION: a known session cookie authenticates with the stored role", async () => {
    const ctx = await getAuthContext(
      createEvent({}, { session_user_id: ADMIN_ID }),
    );
    expect(ctx.userId).toBe(ADMIN_ID);
    expect(ctx.role).toBe(dbStore.profiles.get(ADMIN_ID)!.role);
  });

  it("SESSION: an unknown session cookie is treated as anonymous", async () => {
    const ctx = await getAuthContext(
      createEvent({}, { session_user_id: "not-a-real-user-id" }),
    );
    expect(ctx.userId).toBeNull();
    expect(ctx.role).toBeNull();
  });
});
