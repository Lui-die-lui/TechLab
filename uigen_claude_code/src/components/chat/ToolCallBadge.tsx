"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

function getBasename(filePath: unknown): string {
  if (typeof filePath !== "string" || !filePath) return "";
  const parts = filePath.split("/");
  return parts[parts.length - 1] ?? "";
}

function getLabel(
  toolName: string,
  args: Record<string, unknown>,
  isDone: boolean
): string {
  const basename = getBasename(args.path);
  const command = typeof args.command === "string" ? args.command : "";

  if (toolName === "str_replace_editor" && basename) {
    if (command === "create")
      return isDone ? `${basename} 생성됨` : `${basename} 생성 중`;
    if (command === "str_replace" || command === "insert")
      return isDone ? `${basename} 수정됨` : `${basename} 수정 중`;
    if (command === "view")
      return isDone ? `${basename} 읽음` : `${basename} 읽는 중`;
    if (command === "undo_edit")
      return isDone ? `${basename} 되돌림` : `${basename} 되돌리는 중`;
  }

  if (toolName === "file_manager" && basename) {
    if (command === "rename")
      return isDone ? `${basename} 이름 변경됨` : `${basename} 이름 변경 중`;
    if (command === "delete")
      return isDone ? `${basename} 삭제됨` : `${basename} 삭제 중`;
  }

  return isDone ? "완료" : "작업 중";
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const isDone =
    toolInvocation.state === "result" && !!toolInvocation.result;
  const label = getLabel(
    toolInvocation.toolName,
    toolInvocation.args as Record<string, unknown>,
    isDone
  );

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
