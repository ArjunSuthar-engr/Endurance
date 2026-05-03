// @vitest-environment jsdom
//
// This file tests the browser-specific code paths of application-store.ts that
// require window.localStorage to be present (the jsdom environment provides
// it). It also tests the expired-session pruning using fake timers.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MIN_FILE_SIZE_BYTES } from "@/lib/document-policy";

// Force a fresh module for every test so the module-level `initialized` flag
// and `inMemoryFallbackStore` are reset to their initial state. Using jsdom
// also means window.localStorage is available, exercising the browser paths.
beforeEach(() => {
  vi.resetModules();
  window.localStorage.clear();
});

const VALID_SIZE = MIN_FILE_SIZE_BYTES + 1024;

async function getStore() {
  const mod = await import("@/lib/application-store");
  return mod;
}

function makeUploadInput(overrides: Record<string, unknown> = {}) {
  return {
    applicationId: "APP-STUDENT-0001",
    userId: "demo-user-student",
    documentType: "passport" as const,
    fileName: "passport.pdf",
    fileSize: VALID_SIZE,
    mimeType: "application/pdf",
    checksum: `cs-${Math.random()}`,
    ...overrides,
  };
}

// ─── localStorage hydration ───────────────────────────────────────────────────

describe("application-store (browser) – localStorage hydration", () => {
  it("seeds the default user and application on first hydration in browser env", async () => {
    const store = await getStore();
    const { user, application } = store.ensureApplicationData();

    expect(user.id).toBe(store.DEMO_USER_ID);
    expect(application.id).toBe(store.DEMO_APPLICATION_ID);
  });

  it("persists data to localStorage after seeding", async () => {
    const store = await getStore();
    store.ensureApplicationData();

    const raw = window.localStorage.getItem("endurance-application-store-v1");
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(Array.isArray(parsed.users)).toBe(true);
    expect(parsed.users.length).toBeGreaterThan(0);
  });

  it("loads existing data from localStorage on hydration", async () => {
    // Pre-populate localStorage with valid data
    const seedData = {
      users: [
        {
          id: "persisted-user",
          email: "p@example.com",
          displayName: "Persisted",
          role: "student",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      applications: [
        {
          id: "persisted-app",
          userId: "persisted-user",
          status: "active",
          requiredDocuments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      documents: [],
      verificationChecks: [],
      alerts: [],
      events: [],
    };
    window.localStorage.setItem(
      "endurance-application-store-v1",
      JSON.stringify(seedData)
    );

    const store = await getStore();

    // Trigger hydration
    const app = store.getApplicationRecord("persisted-app");
    expect(app).not.toBeNull();
    expect(app!.id).toBe("persisted-app");
  });

  it("falls back to seeding when localStorage contains invalid JSON", async () => {
    window.localStorage.setItem("endurance-application-store-v1", "{invalid-json");

    const store = await getStore();

    // Should not throw – falls back to in-memory seed
    const { user } = store.ensureApplicationData();
    expect(user.id).toBe(store.DEMO_USER_ID);
  });

  it("seeds a new user when localStorage has valid structure but empty users array", async () => {
    const emptyStore = {
      users: [],
      applications: [],
      documents: [],
      verificationChecks: [],
      alerts: [],
      events: [],
    };
    window.localStorage.setItem(
      "endurance-application-store-v1",
      JSON.stringify(emptyStore)
    );

    const store = await getStore();
    const { user } = store.ensureApplicationData();
    expect(user.id).toBe(store.DEMO_USER_ID);
  });

  it("persists a newly written document to localStorage", async () => {
    const store = await getStore();
    store.ensureApplicationData();

    store.writeDocument({
      applicationId: store.DEMO_APPLICATION_ID,
      userId: store.DEMO_USER_ID,
      fileName: "passport.pdf",
      fileSize: VALID_SIZE,
      mimeType: "application/pdf",
      checksum: "persist-test-cs",
      documentType: "passport",
      status: "verifying",
      authenticityScore: 0,
      uploadedAt: new Date().toISOString(),
    });

    const raw = window.localStorage.getItem("endurance-application-store-v1");
    const parsed = JSON.parse(raw!);
    expect(parsed.documents).toHaveLength(1);
    expect(parsed.documents[0].checksum).toBe("persist-test-cs");
  });
});

// ─── expired session pruning ──────────────────────────────────────────────────

describe("application-store (browser) – expired upload session pruning", () => {
  it("prunes an expired session the next time requestUploadSession is called", async () => {
    vi.useFakeTimers();

    const store = await getStore();
    store.ensureApplicationData();

    // Create the first session at t=0
    store.requestUploadSession(makeUploadInput({ checksum: "prune-cs-1" }));

    // Advance time past the 15-minute TTL so the session expires
    vi.advanceTimersByTime(16 * 60 * 1000);

    // A second call to requestUploadSession triggers pruneUploadSessions,
    // which should remove the expired session without errors
    expect(() =>
      store.requestUploadSession(makeUploadInput({ checksum: "prune-cs-2" }))
    ).not.toThrow();

    vi.useRealTimers();
  });
});
