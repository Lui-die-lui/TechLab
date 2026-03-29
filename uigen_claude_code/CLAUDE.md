# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# One-time setup
npm run setup              # Install deps, generate Prisma client, run migrations

# Development
npm run dev                # Start dev server with Turbopack on http://localhost:3000

# Testing & Linting
npm run test               # Run Vitest suite
npm run lint               # Run ESLint

# Build & Production
npm run build              # Build Next.js app
npm run start              # Serve production build

# Database
npx prisma migrate dev     # Apply schema changes as a new migration
npm run db:reset           # Nuke and rebuild the database
npx prisma studio          # GUI database explorer
```

**Build note:** `NODE_OPTIONS='--require ./node-compat.cjs'` is required for build/start due to a Node.js 25+ `localStorage` SSR issue.

## Architecture

UIGen is a full-stack Next.js 15 app where users describe React components in natural language and see them rendered live. Here is how the pieces connect:

### Request Flow

1. User types in `MessageInput` → `ChatContext` (Vercel AI SDK `useChat`) submits to `POST /api/chat`
2. `/api/chat/route.ts` calls Claude via `@ai-sdk/anthropic` with two tools: `str_replace_editor` and `file_manager`
3. Claude streams tool calls back; `ChatContext.onToolCall` intercepts each one and delegates to `FileSystemContext.handleToolCall`
4. `FileSystemContext` applies changes to the in-memory `VirtualFileSystem` and increments `refreshTrigger`
5. `PreviewFrame` (an iframe) detects the trigger, calls `jsxTransformer.ts` to Babel-transform all JSX files into blob URLs, builds an ES import map (remapping third-party packages to `esm.sh`), and reloads

### Key Files

| File | Role |
|------|------|
| `src/app/api/chat/route.ts` | Streaming AI endpoint; defines tools, prompt caching, and DB save on `onFinish` |
| `src/app/main-content.tsx` | Root UI; wraps `ChatProvider` + `FileSystemProvider`, renders 3-panel layout |
| `src/lib/file-system.ts` | `VirtualFileSystem` class — in-memory file tree, serializes to JSON for DB storage |
| `src/lib/contexts/file-system-context.tsx` | React context exposing VFS; processes tool call results from Claude |
| `src/lib/contexts/chat-context.tsx` | Wraps Vercel AI `useChat`; routes tool calls to file system context |
| `src/lib/transform/jsx-transformer.ts` | In-browser Babel transform — converts JSX → JS, builds import map with blob URLs |
| `src/components/preview/PreviewFrame.tsx` | Sandboxed iframe; re-renders on every `refreshTrigger` change |
| `src/lib/provider.ts` | Returns real Claude model (`claude-haiku-4-5`) or `MockLanguageModel` if no API key |
| `src/lib/prompts/generation.tsx` | System prompt given to Claude |
| `src/lib/tools/str-replace.ts` | `str_replace_editor` tool: view / create / str_replace / insert operations |
| `src/lib/tools/file-manager.ts` | `file_manager` tool: rename / delete operations |
| `src/actions/` | Server actions for auth (signUp, signIn, signOut) and project CRUD |
| `prisma/schema.prisma` | SQLite schema — `User` and `Project` (messages + files stored as JSON strings) |

### Authentication & Persistence

- Sessions use JWT stored in HTTP-only cookies (`src/lib/auth.ts` via `jose`)
- Authenticated users: project messages and VFS state are saved to SQLite on every chat turn (`onFinish` in `route.ts`)
- Anonymous users: work lives in memory only; `anon-work-tracker.ts` uses `localStorage` as a fallback

### Mock Provider

When `ANTHROPIC_API_KEY` is absent or empty, `src/lib/provider.ts` returns a `MockLanguageModel` that generates hardcoded component examples with simulated streaming delays. This lets the UI be developed without an API key.

### Environment

```
ANTHROPIC_API_KEY=   # Required for real AI generation; omit for mock mode
```

### Database

SQLite via Prisma. The Prisma client is generated to `src/generated/prisma/` (not the default location). Always run `npx prisma generate` after schema changes.
