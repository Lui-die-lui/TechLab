import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// --- mocks ---

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

// --- typed imports for mock control ---

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

// --- helpers ---

const SUCCESS = { success: true };
const FAILURE = { success: false, error: "Invalid credentials" };

beforeEach(() => {
  vi.clearAllMocks();
  // safe defaults
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" } as any);
});

// ────────────────────────────────────────────────────────────────────────────
describe("useAuth", () => {
  // ── initial state ──────────────────────────────────────────────────────────
  describe("initial state", () => {
    it("returns isLoading as false initially", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    it("exposes signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  // ── signIn ─────────────────────────────────────────────────────────────────
  describe("signIn", () => {
    it("sets isLoading to true while signing in, then resets to false", async () => {
      let resolveSignIn!: (v: any) => void;
      mockSignIn.mockReturnValue(new Promise((r) => (resolveSignIn = r)));

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn(SUCCESS);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("returns the action result on success", async () => {
      mockSignIn.mockResolvedValue(SUCCESS);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "password");
      });

      expect(returnValue).toEqual(SUCCESS);
    });

    it("returns the action result on failure without throwing", async () => {
      mockSignIn.mockResolvedValue(FAILURE);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signIn("bad@example.com", "wrong");
      });

      expect(returnValue).toEqual(FAILURE);
      expect(result.current.isLoading).toBe(false);
    });

    it("resets isLoading to false even when action throws", async () => {
      mockSignIn.mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("user@example.com", "password");
        } catch {}
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("does NOT redirect when sign-in fails", async () => {
      mockSignIn.mockResolvedValue(FAILURE);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // ── signUp ─────────────────────────────────────────────────────────────────
  describe("signUp", () => {
    it("sets isLoading to true while signing up, then resets to false", async () => {
      let resolveSignUp!: (v: any) => void;
      mockSignUp.mockReturnValue(new Promise((r) => (resolveSignUp = r)));

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signUp("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp(SUCCESS);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("returns the action result", async () => {
      mockSignUp.mockResolvedValue(SUCCESS);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signUp("new@example.com", "securePass1");
      });

      expect(returnValue).toEqual(SUCCESS);
    });

    it("resets isLoading to false even when action throws", async () => {
      mockSignUp.mockRejectedValue(new Error("server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("user@example.com", "password");
        } catch {}
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  // ── post sign-in routing (handlePostSignIn) ────────────────────────────────
  describe("post sign-in routing", () => {
    describe("when anonymous work exists", () => {
      const anonWork = {
        messages: [{ role: "user", content: "make a button" }],
        fileSystemData: { "/App.tsx": { type: "file", content: "<button/>" } },
      };

      beforeEach(() => {
        mockGetAnonWorkData.mockReturnValue(anonWork as any);
        mockCreateProject.mockResolvedValue({ id: "anon-project-id" } as any);
      });

      it("creates a project with anon work and redirects to it", async () => {
        mockSignIn.mockResolvedValue(SUCCESS);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^Design from /),
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        });
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
      });

      it("does NOT call getProjects when anon work is present", async () => {
        mockSignIn.mockResolvedValue(SUCCESS);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password");
        });

        expect(mockGetProjects).not.toHaveBeenCalled();
      });
    });

    describe("when no anonymous work exists", () => {
      beforeEach(() => {
        mockGetAnonWorkData.mockReturnValue(null);
      });

      it("redirects to most recent project if one exists", async () => {
        mockSignIn.mockResolvedValue(SUCCESS);
        mockGetProjects.mockResolvedValue([
          { id: "existing-project" },
          { id: "older-project" },
        ] as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password");
        });

        expect(mockPush).toHaveBeenCalledWith("/existing-project");
        expect(mockCreateProject).not.toHaveBeenCalled();
      });

      it("creates a new project and redirects when no projects exist", async () => {
        mockSignIn.mockResolvedValue(SUCCESS);
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "brand-new-id" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password");
        });

        expect(mockCreateProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^New Design #/),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith("/brand-new-id");
      });
    });

    describe("when anon work data exists but has no messages (empty)", () => {
      it("falls through to getProjects instead of creating an anon project", async () => {
        mockSignIn.mockResolvedValue(SUCCESS);
        mockGetAnonWorkData.mockReturnValue({
          messages: [],
          fileSystemData: {},
        } as any);
        mockGetProjects.mockResolvedValue([{ id: "user-project" }] as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password");
        });

        // empty messages → skip anon-project branch
        expect(mockPush).toHaveBeenCalledWith("/user-project");
        expect(mockClearAnonWork).not.toHaveBeenCalled();
      });
    });

    it("does not redirect when signIn returns failure", async () => {
      mockSignIn.mockResolvedValue(FAILURE);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it("same post-sign-in routing applies after signUp success", async () => {
      mockSignUp.mockResolvedValue(SUCCESS);
      mockGetProjects.mockResolvedValue([{ id: "signup-project" }] as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "newpassword");
      });

      expect(mockPush).toHaveBeenCalledWith("/signup-project");
    });
  });
});
