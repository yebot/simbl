import type { SimblFile } from "../core/task.ts";
import { getAllTasks } from "../core/parser.ts";
import {
  renderTagCloud,
  renderPriorityFilter,
  renderStatusFilter,
  renderProjectFilter,
  renderTaskTable,
  extractAllProjects,
  escapeHtml,
} from "./templates.ts";

/**
 * Render the full page layout
 */
export function renderPage(file: SimblFile, projectName?: string): string {
  const allTasks = getAllTasks(file);
  const pageTitle = projectName ? `${projectName} - SIMBL` : "SIMBL";
  const headerTitle = projectName || "SIMBL";

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.colors.min.css">
  <script src="https://unpkg.com/htmx.org@2.0.4"></script>
  <style>
    /* Pico CSS variable overrides */
    :root {
      --pico-color: var(--pico-color-zinc-700);

      --pico-font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      --pico-font-size: 90%;
      --pico-border-radius: 0.375rem;
      --pico-primary: var(--pico-color-azure-400);
      --pico-primary-background: var(--pico-color-azure-400);
      --pico-spacing: .8rem;
      --pico-background-color: #ffffff;
      --pico-card-background-color: var(--pico-color-azure-50);

      /* SIMBL status colors */
      --simbl-in-progress-bg: var(--pico-color-azure-400);
      --simbl-in-progress-bg-light: var(--pico-color-azure-50);
      --simbl-in-progress-text: var(--pico-color-azure-600);

      --simbl-done-bg: var(--pico-color-lime-300);
      --simbl-done-bg-light: var(--pico-color-lime-50);
      --simbl-done-text: var(--pico-color-lime-600);

      /* SIMBL Priority colors */
      --simbl-p1-bg: var(--pico-color-orange-400);
      --simbl-p1-bg-light: var(--pico-color-orange-350);
      --simbl-p1-text: var(--pico-color-orange-800);

      --simbl-p2-bg: var(--pico-color-orange-350);
      --simbl-p2-bg-light: var(--pico-color-orange-300);
      --simbl-p2-text: var(--pico-color-orange-800);

      --simbl-p3-bg: var(--pico-color-orange-300);
      --simbl-p3-bg-light: var(--pico-color-orange-250);
      --simbl-p3-text: var(--pico-color-orange-800);

      --simbl-p4-bg: var(--pico-color-orange-250);
      --simbl-p4-bg-light: var(--pico-color-orange-200);
      --simbl-p4-text: var(--pico-color-orange-800);

      --simbl-p5-and-up-bg: var(--pico-color-orange-200);
      --simbl-p5-and-up-bg-light: var(--pico-color-orange-150);
      --simbl-p5-and-up-text: var(--pico-color-orange-800);

      
      /* SIMBL tag colors */
      --simbl-tag-bg: var(--pico-color-zinc-300);
      --simbl-tag-bg-light: var(--pico-color-zinc-50);
      --simbl-tag-text: var(--pico-color-zinc-500);

      /* SIMBL Project colors */
      --simbl-project-bg: var(--pico-color-violet-400);
      --simbl-project-bg-light: var(--pico-color-violet-100);
      --simbl-project-text: var(--pico-color-violet-600);

      --simbl-add-task-bg: var(--simbl-done-bg);
    }

    body, h1, h2, h3, h4, h5, h6, td, th {
      color: var(--pico-color-zinc-700);
    }

    button {
      padding: .5rem 1rem;
      border-width: 0;
    }
    
    .input-sm {
      font-size: .8em;
    }

    .btn-add-task {
      background-color: var(--simbl-add-task-bg);
      font-size: 1.2em;
      font-weight: 400;
    }
    .btn-add-task .btn-text {
      display: inline;
    }
    @media (max-width: 576px) {
      .btn-add-task .btn-text {
        display: none;
      }
    }

    .priority-badge {
      padding: 2px 8px;
      border-radius: var(--pico-border-radius);
      font-size: .8em;
    }

    .task-id {
      background: var(--simbl-tag-bg-light);
      color: var(--simbl-tag-text);
      padding: 2px 8px;
      border-radius: var(--pico-border-radius);
      border: .12rem dashed var(--simbl-tag-bg);
      font-size: .85em;
    }

    /* Clickable task ID in modal */
    .task-id-clickable {
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .task-id-clickable:hover {
      background: var(--simbl-tag-bg);
      color: var(--pico-color-slate-50);
    }
    .task-id-clickable:active {
      transform: scale(0.98);
    }
    .task-id-clickable.copied {
      background: var(--pico-color-green-100);
      border-color: var(--pico-color-green-300);
      color: var(--pico-color-green-600);
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

    /* Native dialog element styling */
    #modal-dialog {
      border: none;
      border-radius: var(--pico-border-radius);
      padding: 0;
      max-width: 1100px;
      width: 95%;
      max-height: 90vh;
      overflow: visible;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    }

    #modal-dialog::backdrop {
      background: rgba(0, 0, 0, 0.5);
    }

    #modal-content {
      background: var(--pico-background-color);
      padding: calc(var(--pico-spacing) * 2);
      border-radius: var(--pico-border-radius);
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      transition: max-width 200ms ease, width 200ms ease, max-height 200ms ease, height 200ms ease, border-radius 200ms ease;
    }

    #modal-dialog.maximized {
      max-width: 98vw;
      width: 98vw;
      max-height: 98vh;
    }

    #modal-dialog.maximized #modal-content {
      max-height: 98vh;
      height: 98vh;
    }

    #modal-dialog.maximized .content-textarea {
      min-height: calc(98vh - 400px);
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

    /* Task log section */
    .task-log-section {
      margin-top: var(--pico-spacing);
    }
    .task-log-section summary {
      font-size: 0.9em;
      padding: 0.5rem 0.75rem;
    }
    .task-log-section summary small {
      color: var(--pico-muted-color);
      margin-left: 0.5rem;
    }
    .task-log-content {
      background: var(--pico-card-background-color);
      border-left: 3px solid var(--pico-muted-border-color);
      padding: var(--pico-spacing);
      max-height: 300px;
      overflow-y: auto;
      font-size: 0.9em;
    }
    .task-log-entry {
      padding: 0.4rem 0;
      border-bottom: 1px solid var(--pico-muted-border-color);
      display: flex;
      gap: 1rem;
      align-items: baseline;
    }
    .task-log-entry:last-child {
      border-bottom: none;
    }
    .task-log-timestamp {
      font-family: monospace;
      font-size: 0.85em;
      color: var(--pico-muted-color);
      white-space: nowrap;
    }
    .task-log-message {
      flex: 1;
    }

    /* Tag badges */
    .tag-badge, .tag-btn {
      background: var(--simbl-tag-bg-light);
      color: var(--simbl-tag-text);
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

    /* Keyboard navigation selection */
    table tbody tr.kb-selected td {
      background: var(--pico-color-yellow-50);
    }

    /* Keyboard hints footer */
    .keyboard-hints {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--pico-color-zinc-100);
      border-top: 1px solid var(--pico-color-zinc-200);
      padding: 0.4rem 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.25rem;
      font-size: 0.8em;
      color: var(--pico-color-zinc-500);
      z-index: 100;
    }
    .keyboard-hints span {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .keyboard-hints kbd {
      display: inline-block;
      min-width: 1.4em;
      padding: 0.15rem 0.35rem;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.85em;
      font-weight: 500;
      line-height: 1;
      text-align: center;
      color: var(--pico-color-zinc-600);
      background: var(--pico-color-zinc-50);
      border: 1px solid var(--pico-color-zinc-300);
      border-radius: 4px;
      box-shadow: 0 1px 1px rgba(0,0,0,0.05), inset 0 -1px 0 rgba(0,0,0,0.05);
    }
    /* Add bottom padding to main so content isn't hidden behind footer */
    main.container {
      padding-bottom: 3rem;
    }

    th[hx-get]:hover {
      text-decoration: underline;
    }

    /* Task Log Section */
    .task-log-section {
      margin-top: var(--pico-spacing);
    }
    .task-log-section summary {
      font-size: 0.9em;
      padding: 0.5rem 1rem;
    }
    .task-log-section summary small {
      color: var(--pico-muted-color);
      margin-left: 0.5em;
    }
    .task-log-content {
      background: var(--pico-color-slate-50);
      border-left: 3px solid var(--pico-color-slate-300);
      padding: var(--pico-spacing);
      max-height: 300px;
      overflow-y: auto;
      font-size: 0.9em;
      margin-top: calc(var(--pico-spacing) / 2);
    }
    .task-log-entry {
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--pico-color-slate-200);
      display: flex;
      gap: 1rem;
      align-items: baseline;
    }
    .task-log-entry:last-child {
      border-bottom: none;
    }
    .task-log-timestamp {
      font-family: monospace;
      font-size: 0.8em;
      color: var(--pico-muted-color);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .task-log-message {
      color: var(--pico-color);
    }

    /* Error toast */
    .error-toast {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background: var(--pico-color-red-300);
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
      <h1>${escapeHtml(headerTitle)}</h1>
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
      >+<span class="btn-text"> Add Task</span></button>
    </header>

    <section>
      <div style="margin-bottom: var(--pico-spacing);">
        <strong>Tags</strong>
        ${renderTagCloud(allTasks)}
      </div>
      <div style="margin-bottom: var(--pico-spacing); display: flex; gap: calc(var(--pico-spacing) * 2); flex-wrap: wrap;">
        <div>
          <strong>Priority</strong>
          ${renderPriorityFilter(allTasks)}
        </div>
        <div>
          <strong>Status</strong>
          ${renderStatusFilter()}
        </div>
        <div id="project-filter-section" style="${
          extractAllProjects(allTasks).length === 0 ? "display: none;" : ""
        }">
          <strong>Project</strong>
          ${renderProjectFilter(allTasks)}
        </div>
      </div>
    </section>

    <section>
      <div id="tasks-container">
        ${renderTaskTable(allTasks)}
      </div>
    </section>

    <div id="modal-container"></div>
  </main>

  <footer class="keyboard-hints" aria-label="Keyboard shortcuts">
    <span><kbd>n</kbd> New task</span>
    <span><kbd>p</kbd> Priority</span>
    <span><kbd>/</kbd> Search</span>
    <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
    <span><kbd>Enter</kbd> Open</span>
  </footer>

  <script>
    // Close modal helper function
    function closeModal() {
      const dialog = document.getElementById('modal-dialog');
      if (dialog) {
        dialog.close();
      }
      document.getElementById('modal-container').innerHTML = '';
    }

    // Close modal on backdrop click (dialog element handles click outside content)
    document.addEventListener('click', function(e) {
      const dialog = document.getElementById('modal-dialog');
      if (dialog && e.target === dialog) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }

      // Skip if modifier keys are pressed (except Shift for some keys)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Skip if typing in an input
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.hasAttribute('contenteditable')
      );

      const modalOpen = document.getElementById('modal-dialog') !== null;
      const key = e.key.toLowerCase();

      // 'w' - Toggle maximize on task detail modal only
      if (key === 'w' && modalOpen && !isTyping) {
        const taskModal = document.querySelector('#modal-content[data-task-id]');
        if (taskModal) {
          e.preventDefault();
          toggleModalMaximize();
        }
        return;
      }

      // Shortcuts that only work when no modal is open
      if (modalOpen) return;

      // 'n' - Open Add Task modal
      if (key === 'n' && !isTyping) {
        e.preventDefault();
        htmx.ajax('GET', '/add', {target: '#modal-container', swap: 'innerHTML'});
        return;
      }

      // '/' - Focus search input
      if (key === '/' && !isTyping) {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
        return;
      }

      // 'p' - Cycle through priority filters
      if (key === 'p' && !isTyping) {
        e.preventDefault();
        cyclePriorityFilter();
        return;
      }

      // Arrow Down - Navigate down through task list
      if (e.key === 'ArrowDown' && !isTyping) {
        e.preventDefault();
        navigateTaskList(1);
        return;
      }

      // Arrow Up - Navigate up through task list
      if (e.key === 'ArrowUp' && !isTyping) {
        e.preventDefault();
        navigateTaskList(-1);
        return;
      }

      // Enter or Space - Open selected task
      if ((key === 'enter' || key === ' ') && !isTyping) {
        const selectedRow = document.querySelector('tr.kb-selected');
        if (selectedRow) {
          e.preventDefault();
          selectedRow.click();
        }
        return;
      }
    });

    // Modal maximize toggle
    function toggleModalMaximize() {
      const dialog = document.getElementById('modal-dialog');
      const btn = document.getElementById('modal-maximize-btn');
      if (!dialog || !btn) return;

      const isMaximized = dialog.classList.toggle('maximized');
      btn.setAttribute('aria-pressed', isMaximized ? 'true' : 'false');
      btn.setAttribute('aria-label', isMaximized ? 'Restore modal' : 'Maximize modal');
      btn.setAttribute('title', isMaximized ? 'Restore' : 'Maximize');
      btn.textContent = isMaximized ? '⧉' : '⛶';
    }

    // Copy task ID to clipboard
    function copyTaskId(taskId, element) {
      navigator.clipboard.writeText(taskId).then(function() {
        // Show feedback on the clicked element
        if (element) {
          const originalText = element.textContent;
          element.textContent = 'Copied';
          element.classList.add('copied');
          setTimeout(function() {
            element.textContent = originalText;
            element.classList.remove('copied');
          }, 1000);
        }
      }).catch(function(err) {
        console.error('Failed to copy task ID:', err);
        showError('Failed to copy to clipboard');
      });
    }

    // Cycle through priority filters (none → P1 → P2 → P3 → none)
    function cyclePriorityFilter() {
      // Get all priority filter buttons
      const priorityBtns = Array.from(document.querySelectorAll('[data-priority-filter]'));
      if (priorityBtns.length === 0) return;

      // Build sorted list of priority values
      const priorities = priorityBtns
        .map(function(btn) { return btn.getAttribute('data-priority-filter'); })
        .sort(function(a, b) { return parseInt(a) - parseInt(b); });

      // Find currently active priority by checking which button would deselect (hx-get="/tasks")
      // Active button has hx-get="/tasks", inactive buttons have hx-get="/tasks?priority=X"
      const activeBtn = priorityBtns.find(function(btn) {
        return btn.getAttribute('hx-get') === '/tasks';
      });
      const currentPriority = activeBtn ? activeBtn.getAttribute('data-priority-filter') : null;

      // Cycle: none → P1 → P2 → P3 → none
      let nextPriority;
      if (currentPriority === null) {
        // No filter → first priority
        nextPriority = priorities[0];
      } else {
        const currentIndex = priorities.indexOf(currentPriority);
        if (currentIndex === priorities.length - 1) {
          // Last priority → clear filter
          nextPriority = null;
        } else {
          // Go to next priority
          nextPriority = priorities[currentIndex + 1];
        }
      }

      // Apply the filter
      if (nextPriority === null) {
        // Clear filter - click the active button to deselect
        if (activeBtn) {
          activeBtn.click();
        }
      } else {
        // Click the button for the next priority
        const targetBtn = priorityBtns.find(function(btn) {
          return btn.getAttribute('data-priority-filter') === nextPriority;
        });
        if (targetBtn) {
          targetBtn.click();
        }
      }
    }

    // Navigate through task list with j/k
    let selectedTaskIndex = -1;

    function navigateTaskList(direction) {
      const rows = Array.from(document.querySelectorAll('#tasks-container table tbody tr'));
      if (rows.length === 0) return;

      // Remove current selection
      rows.forEach(function(row) {
        row.classList.remove('kb-selected');
      });

      // Calculate new index
      if (selectedTaskIndex === -1) {
        // No selection yet, start at first (j) or last (k)
        selectedTaskIndex = direction > 0 ? 0 : rows.length - 1;
      } else {
        selectedTaskIndex += direction;
        // Wrap around
        if (selectedTaskIndex < 0) {
          selectedTaskIndex = rows.length - 1;
        } else if (selectedTaskIndex >= rows.length) {
          selectedTaskIndex = 0;
        }
      }

      // Apply selection
      const selectedRow = rows[selectedTaskIndex];
      if (selectedRow) {
        selectedRow.classList.add('kb-selected');
        selectedRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    // Select row on click (for mouse users)
    function selectTaskRow(row) {
      const rows = Array.from(document.querySelectorAll('#tasks-container table tbody tr'));
      rows.forEach(function(r) {
        r.classList.remove('kb-selected');
      });
      row.classList.add('kb-selected');
      selectedTaskIndex = rows.indexOf(row);
    }

    // Attach click and hover handlers to task rows (use event delegation)
    document.getElementById('tasks-container').addEventListener('click', function(evt) {
      const row = evt.target.closest('tr');
      if (row && row.closest('tbody')) {
        selectTaskRow(row);
      }
    });

    document.getElementById('tasks-container').addEventListener('mouseover', function(evt) {
      const row = evt.target.closest('tr');
      if (row && row.closest('tbody')) {
        selectTaskRow(row);
      }
    });

    // Reset selection when tasks are updated via HTMX
    document.body.addEventListener('htmx:afterSwap', function(evt) {
      if (evt.detail.target.id === 'tasks-container') {
        selectedTaskIndex = -1;
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
