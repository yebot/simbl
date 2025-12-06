# SIMBL Browser UI Research

## Question
Would Bun's built-in HTTP server be helpful for a future browser UI for SIMBL?

## Short Answer
**Yes, absolutely.** Bun's built-in HTTP server is well-suited for a local browser UI. It requires zero additional dependencies and integrates seamlessly with the existing Bun-based CLI.

## Bun HTTP Server Capabilities

From the Bun documentation:

| Feature | Details |
|---------|---------|
| Server creation | `Bun.serve()` - simple, high-performance |
| Static files | `Bun.file()` for lazy-loading files |
| Routing | Static, dynamic (`/task/:id`), wildcards |
| WebSockets | Built-in pub/sub for real-time updates |
| Performance | ~2.5x more requests/sec than Node.js |
| Frontend bundling | Can serve React/TypeScript/Tailwind directly |

## Architecture Options

### Option A: Minimal JSON API + Static HTML
```
simbl serve              # Start local server on http://localhost:3456
├── GET /api/tasks       # List tasks (JSON)
├── GET /api/tasks/:id   # Get single task
├── POST /api/tasks      # Add task
├── PATCH /api/tasks/:id # Update task
├── DELETE /api/tasks/:id
└── Static HTML/JS/CSS   # Simple vanilla JS frontend
```

**Pros:** No frontend build step, tiny bundle, works in compiled binary
**Cons:** Limited interactivity

### Option B: Full React SPA
```
simbl serve
├── API endpoints (same as above)
└── React app with Bun's frontend bundling
```

**Pros:** Rich Kanban-style UI, drag-and-drop
**Cons:** Larger binary, more complexity

### Option C: HTMX + Server-Rendered HTML
```
simbl serve
├── HTML endpoints with HTMX attributes
└── Minimal JS, server does the work
```

**Pros:** Simple, progressive enhancement, small payload
**Cons:** Less familiar pattern

## Recommendation

For SIMBL's use case (local dev tool, single user), **Option A or C** makes the most sense:

1. **Zero external dependencies** - Bun handles everything
2. **Small binary size** - Important for `bun build --compile`
3. **WebSocket support** - Can push updates when tasks.md changes (file watcher)
4. **Works offline** - No CDN dependencies needed

## Implementation Sketch

```typescript
// src/cli/commands/serve.ts
import { findSimblDir, getSimblPaths } from '../../core/config.ts';
import { parseSimblFile, serializeSimblFile } from '../../core/parser.ts';

export function startServer(port = 3456) {
  const simblDir = findSimblDir();

  Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      // API routes
      if (url.pathname === '/api/tasks') {
        const file = parseSimblFile(await Bun.file(paths.tasks).text());
        return Response.json(file);
      }

      // Static files
      if (url.pathname === '/') {
        return new Response(Bun.file('./src/web/index.html'));
      }

      return new Response('Not found', { status: 404 });
    },
  });

  console.log(`SIMBL UI running at http://localhost:${port}`);
}
```

## Questions to Consider

1. **Priority:** Should this be Phase 8, or should Phase 6 (TUI) come first?
2. **Scope:** Full Kanban board, or simple task list view?
3. **Real-time:** WebSocket updates when file changes, or manual refresh?
4. **Edit capability:** Read-only view, or full CRUD through browser?

## Next Steps (if proceeding)

1. Add `simbl serve` command
2. Create minimal HTML/CSS/JS in `src/web/`
3. Implement JSON API endpoints reusing existing parser/writer
4. Optional: Add file watcher + WebSocket for live updates
