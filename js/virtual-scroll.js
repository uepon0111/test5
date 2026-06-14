// js/virtual-scroll.js

// ===== Virtual List (fixed height rows) =====
export class VirtualList {
  constructor(container, options) {
    this.container = container;
    this.itemH     = options.itemHeight || 68;
    this.buffer    = options.buffer || 6;
    this.renderFn  = options.renderItem;
    this.items     = [];

    container.style.overflowY = 'auto';
    container.style.position  = 'relative';

    this.inner = document.createElement('div');
    this.inner.className = 'virtual-list-inner';
    this.inner.style.position = 'relative';
    container.appendChild(this.inner);

    this._onScroll = this._render.bind(this);
    container.addEventListener('scroll', this._onScroll, { passive: true });

    this._ro = new ResizeObserver(() => this._render());
    this._ro.observe(container);
  }

  setItems(items) {
    this.items = items;
    this.inner.style.height = `${items.length * this.itemH}px`;
    this._render();
  }

  // Scroll so that index is visible
  scrollToIndex(index) {
    const top = index * this.itemH;
    const ch  = this.container.clientHeight;
    const st  = this.container.scrollTop;
    if (top < st) this.container.scrollTop = top;
    else if (top + this.itemH > st + ch) this.container.scrollTop = top + this.itemH - ch;
  }

  _render() {
    const st  = this.container.scrollTop;
    const ch  = this.container.clientHeight;
    if (!ch) return;

    const start = Math.max(0, Math.floor(st / this.itemH) - this.buffer);
    const end   = Math.min(this.items.length - 1, Math.ceil((st + ch) / this.itemH) + this.buffer);

    // Re-use existing DOM nodes by index to avoid thrashing
    const rendered = new Map();
    for (const child of [...this.inner.children]) {
      const idx = parseInt(child.dataset.idx);
      if (!isNaN(idx)) rendered.set(idx, child);
    }

    // Remove out-of-range
    for (const [idx, node] of rendered) {
      if (idx < start || idx > end) node.remove();
    }

    // Add missing
    for (let i = start; i <= end; i++) {
      if (!rendered.has(i)) {
        const node = this.renderFn(this.items[i], i);
        node.dataset.idx = i;
        node.style.cssText = `position:absolute;top:${i * this.itemH}px;left:0;right:0;height:${this.itemH}px;`;
        this.inner.appendChild(node);
      }
    }
  }

  refresh() { this._render(); }
  destroy() {
    this.container.removeEventListener('scroll', this._onScroll);
    this._ro.disconnect();
  }
}

// ===== Virtual Grid (fixed height rows, N columns) =====
export class VirtualGrid {
  constructor(container, options) {
    this.container = container;
    this.rowH      = options.rowHeight || 220;
    this.cols      = options.columns   || 4;
    this.gap       = options.gap       || 12;
    this.buffer    = options.buffer    || 3;
    this.renderFn  = options.renderItem;
    this.items     = [];
    this.padding   = options.padding   || 12;

    container.style.overflowY = 'auto';
    container.style.position  = 'relative';

    this.inner = document.createElement('div');
    this.inner.className = 'virtual-grid-inner';
    this.inner.style.cssText = 'position:relative;';
    container.appendChild(this.inner);

    this._onScroll = this._render.bind(this);
    container.addEventListener('scroll', this._onScroll, { passive: true });
    this._ro = new ResizeObserver(() => this._render());
    this._ro.observe(container);
  }

  setItems(items, cols) {
    this.items = items;
    if (cols !== undefined) this.cols = cols;
    const rows = Math.ceil(items.length / this.cols);
    this.inner.style.height = `${rows * (this.rowH + this.gap) + this.padding * 2}px`;
    this._render();
  }

  setCols(cols) {
    this.cols = cols;
    const rows = Math.ceil(this.items.length / this.cols);
    this.inner.style.height = `${rows * (this.rowH + this.gap) + this.padding * 2}px`;
    this._render();
  }

  _render() {
    const st  = this.container.scrollTop;
    const ch  = this.container.clientHeight;
    if (!ch) return;

    const rowPx  = this.rowH + this.gap;
    const rows   = Math.ceil(this.items.length / this.cols);
    const startR = Math.max(0, Math.floor((st - this.padding) / rowPx) - this.buffer);
    const endR   = Math.min(rows - 1, Math.ceil((st - this.padding + ch) / rowPx) + this.buffer);

    const rendered = new Map();
    for (const child of [...this.inner.children]) {
      const r = parseInt(child.dataset.row);
      if (!isNaN(r)) rendered.set(r, child);
    }

    for (const [r, node] of rendered) {
      if (r < startR || r > endR) node.remove();
    }

    for (let r = startR; r <= endR; r++) {
      if (rendered.has(r)) continue;
      const rowEl = document.createElement('div');
      rowEl.dataset.row = r;
      rowEl.style.cssText = `
        position:absolute;
        top:${r * rowPx + this.padding}px;
        left:${this.padding}px;
        right:${this.padding}px;
        display:grid;
        grid-template-columns:repeat(${this.cols},1fr);
        gap:${this.gap}px;
        height:${this.rowH}px;
      `;

      const startI = r * this.cols;
      for (let c = 0; c < this.cols; c++) {
        const idx = startI + c;
        if (idx < this.items.length) {
          const card = this.renderFn(this.items[idx], idx);
          rowEl.appendChild(card);
        } else {
          rowEl.appendChild(document.createElement('div')); // spacer
        }
      }
      this.inner.appendChild(rowEl);
    }
  }

  refresh() {
    // Clear and re-render
    [...this.inner.children].forEach(c => c.remove());
    this._render();
  }

  destroy() {
    this.container.removeEventListener('scroll', this._onScroll);
    this._ro.disconnect();
  }
}
