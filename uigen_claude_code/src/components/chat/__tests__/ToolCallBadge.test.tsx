import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(overrides: Partial<ToolInvocation>): ToolInvocation {
  return {
    toolCallId: "test-id",
    toolName: "str_replace_editor",
    args: { command: "create", path: "src/components/Foo.tsx" },
    state: "call",
    ...overrides,
  } as ToolInvocation;
}

// --- str_replace_editor: create ---

test("str_replace_editor create: 진행 중 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({ state: "call" })}
    />
  );
  expect(screen.getByText("Foo.tsx 생성 중")).toBeDefined();
});

test("str_replace_editor create: 완료 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({ state: "result", result: "ok" })}
    />
  );
  expect(screen.getByText("Foo.tsx 생성됨")).toBeDefined();
});

// --- str_replace_editor: str_replace ---

test("str_replace_editor str_replace: 진행 중 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: { command: "str_replace", path: "src/components/Foo.tsx" },
        state: "call",
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 수정 중")).toBeDefined();
});

test("str_replace_editor str_replace: 완료 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: { command: "str_replace", path: "src/components/Foo.tsx" },
        state: "result",
        result: "ok",
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 수정됨")).toBeDefined();
});

// --- str_replace_editor: insert (str_replace와 동일 레이블) ---

test("str_replace_editor insert: 진행 중 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: { command: "insert", path: "src/components/Foo.tsx" },
        state: "call",
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 수정 중")).toBeDefined();
});

test("str_replace_editor insert: 완료 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: { command: "insert", path: "src/components/Foo.tsx" },
        state: "result",
        result: "ok",
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 수정됨")).toBeDefined();
});

// --- str_replace_editor: view ---

test("str_replace_editor view: 진행 중 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: { command: "view", path: "src/components/Foo.tsx" },
        state: "call",
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 읽는 중")).toBeDefined();
});

test("str_replace_editor view: 완료 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: { command: "view", path: "src/components/Foo.tsx" },
        state: "result",
        result: "ok",
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 읽음")).toBeDefined();
});

// --- str_replace_editor: undo_edit ---

test("str_replace_editor undo_edit: 진행 중 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: { command: "undo_edit", path: "src/components/Foo.tsx" },
        state: "call",
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 되돌리는 중")).toBeDefined();
});

test("str_replace_editor undo_edit: 완료 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: { command: "undo_edit", path: "src/components/Foo.tsx" },
        state: "result",
        result: "ok",
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 되돌림")).toBeDefined();
});

// --- file_manager: rename ---

test("file_manager rename: 진행 중 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        toolName: "file_manager",
        args: { command: "rename", path: "src/components/Foo.tsx" },
        state: "call",
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 이름 변경 중")).toBeDefined();
});

test("file_manager rename: 완료 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        toolName: "file_manager",
        args: { command: "rename", path: "src/components/Foo.tsx" },
        state: "result",
        result: "ok",
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 이름 변경됨")).toBeDefined();
});

// --- file_manager: delete ---

test("file_manager delete: 진행 중 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        toolName: "file_manager",
        args: { command: "delete", path: "src/components/Foo.tsx" },
        state: "call",
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 삭제 중")).toBeDefined();
});

test("file_manager delete: 완료 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        toolName: "file_manager",
        args: { command: "delete", path: "src/components/Foo.tsx" },
        state: "result",
        result: "ok",
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 삭제됨")).toBeDefined();
});

// --- 폴백 케이스 ---

test("알 수 없는 tool: 진행 중 폴백 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        toolName: "unknown_tool",
        args: {},
        state: "call",
      })}
    />
  );
  expect(screen.getByText("작업 중")).toBeDefined();
});

test("알 수 없는 tool: 완료 폴백 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        toolName: "unknown_tool",
        args: {},
        state: "result",
        result: "ok",
      })}
    />
  );
  expect(screen.getByText("완료")).toBeDefined();
});

test("알 수 없는 command: 폴백 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: { command: "unknown_command", path: "src/components/Foo.tsx" },
        state: "call",
      })}
    />
  );
  expect(screen.getByText("작업 중")).toBeDefined();
});

// --- basename 추출 ---

test("깊은 경로에서 basename 추출", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: {
          command: "create",
          path: "src/components/chat/MessageList.tsx",
        },
        state: "call",
      })}
    />
  );
  expect(screen.getByText("MessageList.tsx 생성 중")).toBeDefined();
});

test("슬래시 없는 경로 (파일명 직접): basename 그대로 사용", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: { command: "create", path: "App.tsx" },
        state: "call",
      })}
    />
  );
  expect(screen.getByText("App.tsx 생성 중")).toBeDefined();
});

test("path 누락 시 폴백 레이블", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        args: { command: "create" },
        state: "call",
      })}
    />
  );
  expect(screen.getByText("작업 중")).toBeDefined();
});

// --- 시각 인디케이터 ---

test("진행 중: animate-spin 클래스 존재", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={makeInvocation({ state: "call" })}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("완료: bg-emerald-500 클래스 존재", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={makeInvocation({ state: "result", result: "ok" })}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});

test("완료: animate-spin 없음", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={makeInvocation({ state: "result", result: "ok" })}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeNull();
});

// --- 엣지 케이스 ---

test("state=result이지만 result가 falsy: 진행 중으로 처리", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({
        state: "result",
        result: null,
      })}
    />
  );
  expect(screen.getByText("Foo.tsx 생성 중")).toBeDefined();
});

// --- 래퍼 스타일 ---

test("래퍼 div에 올바른 스타일 클래스 적용", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={makeInvocation({ state: "call" })}
    />
  );
  const wrapper = container.firstElementChild;
  expect(wrapper?.className).toContain("inline-flex");
  expect(wrapper?.className).toContain("items-center");
  expect(wrapper?.className).toContain("bg-neutral-50");
  expect(wrapper?.className).toContain("rounded-lg");
  expect(wrapper?.className).toContain("font-mono");
});

test("텍스트 span에 text-neutral-700 클래스 적용", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({ state: "call" })}
    />
  );
  const span = screen.getByText("Foo.tsx 생성 중");
  expect(span.className).toContain("text-neutral-700");
});
