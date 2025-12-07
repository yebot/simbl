import type { SimblFile } from "../core/task.ts";
import { getAllTasks } from "../core/parser.ts";
import {
  escapeHtml,
  renderTagCloud,
  renderTaskTable,
  renderViewTabs,
  PICO_CSS,
  PICO_COLORS_CSS,
  HTMX_JS,
} from "./templates.ts";

/**
 * Render the full page layout
 */
export function renderPage(file: SimblFile, projectName?: string): string {
  const allTasks = getAllTasks(file);
  const backlogTasks = file.backlog;
  const title = projectName || "SIMBL";

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${PICO_CSS}">
  <link rel="stylesheet" href="${PICO_COLORS_CSS}">
  <script src="${HTMX_JS}"></script>
  <style>
    /* Pico CSS variable overrides */
    :root {
      --pico-font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      --pico-font-size: 90%;
      --pico-border-radius: 0.375rem;
      --pico-primary: var(--pico-color-azure-400);
      --pico-primary-background: var(--pico-color-azure-400);
      --pico-spacing: .8rem;
      --pico-background-color: #ffffff;
      --pico-card-background-color: var(--pico-color-azure-50);
    }

    button {
      padding: .5rem 1rem;
      border-width: 0;
    }
    
    .input-sm {
      font-size: .8em;
    }

    .btn-add-task {
      background-color: var(--pico-color-green-300);
      font-size: 1.2em;
      font-weight: 400;
    }

    .priority-badge {
      padding: 2px 8px;
      border-radius: var(--pico-border-radius);
      font-size: .8em;
    }

    /* Loading indicator - default hidden */
    .htmx-indicator { display: none; }
    .htmx-request .htmx-indicator { display: inline; }
    .htmx-request.htmx-indicator { display: inline; }

    /* Save indicator - with auto-fade animation */
    .save-indicator {
      color: var(--pico-color-green-500);
      animation: fadeOut 1s ease-in-out forwards;
      animation-delay: 1s;
    }
    @keyframes fadeOut {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }

    /* Relation links - single line with ellipsis */
    .relation-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      max-width: 100%;
      overflow: hidden;
    }
    .relation-link code {
      flex-shrink: 0;
    }
    .relation-title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--pico-muted-color);
    }

    /* Loading state for buttons */
    .htmx-request button {
      opacity: 0.7;
      cursor: wait;
    }

    #modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    #modal-content {
      background: var(--pico-background-color);
      padding: calc(var(--pico-spacing) * 2);
      border-radius: var(--pico-border-radius);
      max-width: 1100px;
      width: 95%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
    }

    /* Modal close button */
    .modal-close-btn {
      background: #f0f0f0;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem 0.75rem;
      line-height: 1;
      color: #666;
      border-radius: var(--pico-border-radius);
      transition: background 0.2s, color 0.2s;
    }
    .modal-close-btn:hover {
      background: #e0e0e0;
      color: #333;
    }

    /* Modal title input */
    .modal-title-input {
      font-size: 1.25rem;
      font-weight: 600;
      width: 100%;
      border: 1px solid transparent;
      background: transparent;
      padding: 0.25rem 0.5rem;
      border-radius: var(--pico-border-radius);
    }
    .modal-title-input:hover,
    .modal-title-input:focus {
      border-color: var(--pico-primary-border);
      background: var(--pico-background-color);
    }

    /* Content textarea */
    .content-textarea {
      width: 100%;
      min-height: 250px;
      font-family: monospace;
      font-size: 1rem;
      resize: vertical;
      line-height: 1.5;
    }

    /* Tag badges */
    .tag-badge, .tag-btn {
      background: var(--pico-color-slate-50);
      color: var(--pico-color-slate-800);
      padding: .2rem .4rem;
      margin: .2rem;
      border-width: 0;
      border-radius: var(--pico-border-radius);
      font-size: 0.85em;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    table tbody tr:hover {
      background: var(--pico-secondary-hover-background);
    }

    th[hx-get]:hover {
      text-decoration: underline;
    }

    /* Error toast */
    .error-toast {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background: var(--pico-color-red-550);
      color: var(--pico-color-slate-50);
      padding: 1rem 1.5rem;
      border-radius: var(--pico-border-radius);
      box-shadow: 0 4px 12px var(--pico-color-slate-950);
      z-index: 2000;
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    /* Loading overlay */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--pico-color-slate-50);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    /* Header layout */
    header {
      display: flex;
      align-items: center;
      gap: var(--pico-spacing);
      margin-bottom: var(--pico-spacing);
    }
    header h1 {
      margin: 0;
      white-space: nowrap;
    }
    header input[type="search"] {
      flex: 1;
      margin: 0;
    }
    header .btn-add-task {
      white-space: nowrap;
      margin: 0;
    }
  </style>
</head>
<body>
  <main class="container">
    <header>
      <h1>${escapeHtml(title)}</h1>
      <input
        type="search"
        id="search-input"
        name="q"
        placeholder="Search tasks..."
        hx-get="/tasks"
        hx-trigger="input changed delay:300ms, search"
        hx-target="#tasks-container"
        hx-swap="innerHTML"
      >
        <button
        class="btn-add-task"
        hx-get="/add"
        hx-target="#modal-container"
        hx-swap="innerHTML"
      >+ Add Task</button>
    </header>

    <section>
      <div style="margin-bottom: var(--pico-spacing);">
        <strong>Tags:</strong>
        ${renderTagCloud(allTasks)}
      </div>
    </section>

    <section>
      <div id="tasks-container">
        ${renderViewTabs("backlog")}
        ${renderTaskTable(backlogTasks)}
      </div>
    </section>

    <div id="modal-container"></div>
  </main>

  <script>
    // Close modal on backdrop click or Escape key
    document.addEventListener('click', function(e) {
      if (e.target.id === 'modal-backdrop') {
        document.getElementById('modal-container').innerHTML = '';
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.getElementById('modal-container').innerHTML = '';
      }
    });

    // Error toast handling
    function showError(message) {
      const existingToast = document.querySelector('.error-toast');
      if (existingToast) existingToast.remove();

      const toast = document.createElement('div');
      toast.className = 'error-toast';
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(function() {
        toast.remove();
      }, 5000);
    }

    // HTMX error handling
    document.body.addEventListener('htmx:responseError', function(evt) {
      showError('Request failed: ' + evt.detail.xhr.statusText);
    });

    document.body.addEventListener('htmx:sendError', function() {
      showError('Network error - please check your connection');
    });

    // WebSocket connection for live updates
    (function() {
      let ws;
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 10;
      const reconnectDelay = 1000;

      function connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(protocol + '//' + window.location.host + '/ws');

        ws.onopen = function() {
          console.log('SIMBL: Live updates connected');
          reconnectAttempts = 0;
        };

        ws.onmessage = function(event) {
          // Process OOB swaps from server
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = event.data;

          // Find and process elements with hx-swap-oob="true"
          const oobElements = tempDiv.querySelectorAll('[hx-swap-oob="true"]');
          oobElements.forEach(function(el) {
            const targetId = el.id;
            if (targetId) {
              const target = document.getElementById(targetId);
              if (target) {
                target.innerHTML = el.innerHTML;
              }
            }
          });

          // Re-process HTMX on swapped content
          if (typeof htmx !== 'undefined') {
            htmx.process(document.body);
          }
        };

        ws.onclose = function() {
          console.log('SIMBL: Live updates disconnected');
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log('SIMBL: Reconnecting in ' + reconnectDelay + 'ms (attempt ' + reconnectAttempts + ')');
            setTimeout(connect, reconnectDelay);
          }
        };

        ws.onerror = function(error) {
          console.error('SIMBL: WebSocket error', error);
        };
      }

      connect();
    })();
  </script>
</body>
</html>`;
}
