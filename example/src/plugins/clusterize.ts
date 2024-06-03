export interface ClusterizeOptions {
  rows?: Array<any>;
  scrollId?: string;
  scrollElement?: HTMLElement;
  contentId?: string;
  contentElement?: HTMLElement;

  rowsInBlock?: number;
  blocksInCluster?: number;
  showNoDataRow?: boolean;
  noDataClass?: string;
  noDataText?: string;
  keepParity?: boolean;
  tag?: string | null;
  DOMMode?: boolean;
  debug?: boolean;
  callbacks?: {
    clusterWillChange?: () => void;
    clusterChanged?: () => void;
    scrollingProgress?: (progress: number) => void;
  };
}

export interface ClusterizeSafeOptions extends ClusterizeOptions {
  rowsInBlock: number;
  blocksInCluster: number;
  tag: string | null;
  showNoDataRow: boolean;
  noDataClass: string;
  noDataText: string;
  keepParity: boolean;
  DOMMode: boolean;
  debug: boolean;
}

export interface ClusterizeGenerateReturn {
  topOffset: number;
  bottomOffset: number;
  rowsAbove: number;
  rows: Array<any>;
}

const DEFAULT_OPTIONS: ClusterizeSafeOptions = {
  rowsInBlock: 50,
  blocksInCluster: 4,
  tag: null,
  showNoDataRow: true,
  noDataClass: 'clusterize-no-data',
  noDataText: 'No data',
  keepParity: true,
  DOMMode: false,
  debug: false,
};

// Detect IE9 and lower
// https://gist.github.com/padolsey/527683#comment-786682
const ieVersion = (function () {
  let v: number;
  let el: HTMLElement;
  let all: Array<HTMLElement>;

  for (
    // @ts-ignore
    v = 3, el = document.createElement('b'), all = el.all || [];
    (el.innerHTML = '<!--[if gt IE ' + ++v + ']><i><![endif]-->'), all[0];

  ) {} // eslint-disable-line
  // @ts-ignore
  return v && v > 4 ? v : document.documentMode;
})();

// Detect mac platform.
const isMac = navigator.userAgent.toLowerCase().includes('mac');

export class Clusterize {
  private _options: ClusterizeSafeOptions;

  private _rows: Array<any> = [];
  private _cache: Record<string, any> = {};

  private _clusterHeight = 0;
  private _itemHeight = 0;
  private _blockHeight = 0;
  private _rowsInCluster = 0;
  private _scrollTop = 0;

  private _contentTag: string | undefined;

  private _contentElem: HTMLElement;
  private _scrollElem: HTMLElement;

  private _lastCluster = 0;

  // Timeouts.
  private _scrollDebounce: any = 0;
  private _resizeDebounce: any = 0;

  // Flags.
  private _pointerEventsSet = false;

  // Debug function (NoOp).
  private _debug: (...args: any[]) => void = (..._: any[]) => {};

  constructor(options: ClusterizeOptions) {
    if (process.env.NODE_ENV === 'development' && options.debug) {
      this._debug = console.warn.bind(console, `clusterize: %s`);
    }

    this._debug('Constructor begin. DOM mode is %s', options.DOMMode);

    this._options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    // Find content element.
    // Warning: inversed from original implementation: actual element ('contentElem') is default vs 'contentId'.
    const contentElem = this._options.contentElement
      ? this._options.contentElement
      : this._options.contentId
      ? document.getElementById(this._options.contentId)
      : null;

    if (!contentElem) {
      throw new Error('Unable to find content element.');
    }

    // Find scroll element.
    // Warning: inversed from original implementation: actual element ('scrollElem') is default vs 'scrollId'.
    const scrollElem = this._options.scrollElement
      ? this._options.scrollElement
      : this._options.scrollId
      ? document.getElementById(this._options.scrollId)
      : null;

    if (!scrollElem) {
      throw new Error('Unable to find scroll element.');
    }

    this._contentElem = contentElem;
    this._scrollElem = scrollElem;

    // `tabIndex` forces the browser to keep focus on the scrolling list.
    if (!this._contentElem.hasAttribute('tabindex'))
      this._contentElem.setAttribute('tabindex', '0');

    this._rows = Array.isArray(options.rows)
      ? options.rows
      : this._fetchMarkup();

    this._scrollTop = this._scrollElem.scrollTop;

    // Append initial data.
    this._insertToDOM();

    // Restore the scroll position.
    this._scrollElem.scrollTop = this._scrollTop;

    // adding scroll handler
    this._lastCluster = 0;
    this._pointerEventsSet = false;

    this._scrollDebounce = 0;
    this._onScroll = this._onScroll.bind(this);

    this._resizeDebounce = 0;
    this._onResize = this._onResize.bind(this);

    this._scrollElem.addEventListener('scroll', this._onScroll);
    window.addEventListener('resize', this._onResize);

    this._debug('Constructor end.');
  }

  public destroy(clean = false) {
    this._debug('Destroy.');

    this._scrollElem.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onResize);
    this._html(clean ? this._generateEmptyRow() : this._rows);

    this._debug('Destroyed.');
  }

  public refresh(force: boolean) {
    this._debug('Refresh.');
    if (this._getRowsHeight() || force) this.update(this._rows);
  }

  public update(newRows: Array<any>) {
    this._debug('Update.', newRows);

    this._rows = Array.isArray(newRows) ? newRows : [];

    this._scrollTop = this._scrollElem.scrollTop;

    if (this._rows.length * this._itemHeight < this._scrollTop) {
      this._scrollElem.scrollTop = 0;
      this._lastCluster = 0;
    }

    this._insertToDOM();
    this._scrollElem.scrollTop = this._scrollTop;

    this._debug('Updated.');
  }

  public clear() {
    this._debug('Clear.');

    this.update([]);
  }

  public append(rows: Array<any>) {
    this._debug(`Append ${rows.length} rows.`);
    const newRows = Array.isArray(rows) ? rows : [];
    if (newRows.length === 0) return;

    this._rows = this._rows.concat(newRows);
    this._insertToDOM();
  }

  public prepend(rows: Array<any>) {
    this._debug(`Prepend ${rows.length} rows.`);
    const newRows = Array.isArray(rows) ? rows : [];
    if (newRows.length === 0) return;

    this._rows = newRows.concat(newRows, this._rows);
    this._insertToDOM();
  }

  // Was getRowsAmount
  public get length(): number {
    return this._rows.length;
  }

  public get scrollProgress(): number {
    return (
      (this._scrollTop / (this._rows.length * this._itemHeight)) * 100 || 0
    );
  }

  public get options(): ClusterizeOptions {
    return this._options;
  }

  public get rows() {
    return this._rows;
  }

  // fetch existing markup.
  private _fetchMarkup() {
    this._debug('Fetch markup.');

    let rows: Array<string | HTMLElement> = [];
    const rowsNodes = this._getChildNodes(this._contentElem);

    if (this._options.DOMMode) {
      rows = rowsNodes;
    } else {
      while (rowsNodes.length) {
        rows.push(rowsNodes.shift()!.outerHTML!);
      }
    }

    return rows;
  }
  // get tag name, content tag name, tag height, calc cluster height
  private _exploreEnvironment(rows: Array<any>) {
    this._debug('Explore environment.');

    this._contentTag = this._contentElem!.tagName.toLowerCase();

    if (rows.length === 0) return;

    if (ieVersion && ieVersion <= 9 && !this._options.tag)
      this._options.tag = rows[0].match(/<([^>\s/]*)/)[1].toLowerCase();

    if (this._contentElem.children.length <= 1)
      this._cache.data = this._html(rows[0]); // + rows[0] + rows[0]);

    if (!this._options.tag)
      this._options.tag = this._contentElem.children[0].tagName.toLowerCase();

    this._getRowsHeight();
  }

  private _getRowsHeight() {
    this._debug('Get rows height.');

    const prevItemHeight = this._itemHeight;
    this._clusterHeight = 0;

    if (!this._rows.length) return;

    const nodes = Array.from(this._contentElem.children) as Array<HTMLElement>;
    if (!nodes.length) return;

    const node = nodes[Math.floor(nodes.length / 2)];
    this._itemHeight = node.offsetHeight;

    // consider table's border-spacing
    if (
      this._options.tag == 'tr' &&
      this._getStyle('borderCollapse', this._contentElem) !== 'collapse'
    )
      this._itemHeight +=
        parseInt(this._getStyle('borderSpacing', this._contentElem), 10) || 0;

    // consider margins (and margins collapsing)
    if (this._options.tag != 'tr') {
      const marginTop = parseInt(this._getStyle('marginTop', node), 10) || 0;
      const marginBottom =
        parseInt(this._getStyle('marginBottom', node), 10) || 0;
      this._itemHeight += Math.max(marginTop, marginBottom);
    }

    this._blockHeight = this._itemHeight * this._options.rowsInBlock;
    this._rowsInCluster =
      this._options.blocksInCluster * this._options.rowsInBlock;
    this._clusterHeight = this._options.blocksInCluster * this._blockHeight;

    this._debug(
      `Row height '%d', block height '%d', rows in cluster '%d'`,
      this._itemHeight,
      this._blockHeight,
      this._rowsInCluster
    );

    return prevItemHeight !== this._itemHeight;
  }

  // get current cluster number
  private _getClusterNum() {
    this._scrollTop = this._scrollElem.scrollTop;

    const clusterDivider = this._clusterHeight - this._blockHeight;
    const currentCluster = Math.floor(this._scrollTop / clusterDivider);
    const maxCluster = Math.floor(
      (this._rows.length * this._itemHeight) / clusterDivider
    );

    this._debug(
      `Cluster number '%d', divider '%d', max '%d'.`,
      currentCluster,
      clusterDivider,
      maxCluster
    );

    return Math.min(currentCluster, maxCluster);
  }

  private _generateEmptyRow() {
    this._debug('Generate empty row.');

    if (!this._options.tag || !this._options.showNoDataRow) return [];

    const emptyRow = document.createElement(this._options.tag);
    const no_data_content = document.createTextNode(this._options.noDataText);
    let td;

    emptyRow.className = this._options.noDataClass;

    if (this._options.tag == 'tr') {
      td = document.createElement('td');
      // fixes #53
      td.colSpan = 100;
      td.appendChild(no_data_content);
    }
    emptyRow.appendChild(td || no_data_content);

    return this._options.DOMMode ? [emptyRow] : [emptyRow.outerHTML];
  }

  private _generate(): ClusterizeGenerateReturn {
    this._debug('Generate rows.');

    if (this._rows.length < this._options.rowsInBlock) {
      return {
        topOffset: 0,
        bottomOffset: 0,
        rowsAbove: 0,
        rows: this._rows.length > 0 ? this._rows : this._generateEmptyRow(),
      };
    }

    const itemsStart = Math.max(
      (this._rowsInCluster - this._options.rowsInBlock) * this._getClusterNum(),
      0
    );

    const itemsEnd = itemsStart + this._rowsInCluster;

    const topOffset = Math.max(itemsStart * this._itemHeight, 0);
    const bottomOffset = Math.max(
      (this._rows.length - itemsEnd) * this._itemHeight,
      0
    );

    const thisClusterRows: Array<any> = [];

    let rowsAbove = itemsStart;
    if (topOffset < 1) {
      rowsAbove++;
    }
    for (let i = itemsStart; i < itemsEnd; i++) {
      this._rows[i] && thisClusterRows.push(this._rows[i]);
    }
    return {
      topOffset,
      bottomOffset,
      rowsAbove,
      rows: thisClusterRows,
    };
  }

  // TODO: `height` parameter and first condition change from the original implementation.
  private _renderExtraTag(className: string, height = 0) {
    this._debug('Render extra tag.');

    if (!this._options.tag) return '';

    const tag = document.createElement(this._options.tag);
    const clusterizePrefix = 'clusterize-';

    tag.className = [
      clusterizePrefix + 'extra-row',
      clusterizePrefix + className,
    ].join(' ');
    height && (tag.style.height = height + 'px');

    return this._options.DOMMode ? tag : tag.outerHTML;
  }

  private _insertToDOM() {
    this._debug('Insert in DOM.');

    if (this._clusterHeight === 0) {
      this._exploreEnvironment(this._rows);
    }

    const data = this._generate();

    const thisClusterRows = data.rows; //.join('');
    const thisClusterContentChanged = this._checkChanges(
      'data',
      thisClusterRows
    );
    const topOffsetChanged = this._checkChanges('top', data.topOffset);
    const onlyBottomOffsetChanged = this._checkChanges(
      'bottom',
      data.bottomOffset
    );
    const callbacks = this.options.callbacks;

    let layout: Array<any> = [];

    if (thisClusterContentChanged || topOffsetChanged) {
      if (data.topOffset) {
        this._options.keepParity &&
          layout.push(this._renderExtraTag('keep-parity'));
        layout.push(this._renderExtraTag('top-space', data.topOffset));
      }

      // layout.push(thisClusterRows);
      layout = layout.concat(thisClusterRows);

      data.bottomOffset &&
        layout.push(this._renderExtraTag('bottom-space', data.bottomOffset));

      // Notify.
      callbacks && callbacks.clusterWillChange && callbacks.clusterWillChange();

      this._html(layout /* .join('') */);

      this._contentTag === 'ol' &&
        this._contentElem.setAttribute('start', String(data.rowsAbove));

      // TODO: should pass all css file in options.
      this._contentElem.style['counter-increment' as any] =
        'clusterize-counter ' + (data.rowsAbove - 1);

      // Notify.
      callbacks && callbacks.clusterChanged && callbacks.clusterChanged();
    } else if (onlyBottomOffsetChanged) {
      (
        this._contentElem.lastChild as HTMLElement
      ).style.height = `${data.bottomOffset}px`;
    }
  }

  // unfortunately ie <= 9 does not allow to use innerHTML for table elements, so make a workaround
  private _html(data: any) {
    this._debug('Generate HTML.');

    if (ieVersion && ieVersion <= 9 && this._options.tag === 'tr') {
      const div = document.createElement('div');
      let last: ChildNode | null;

      // WARNING: is '<table><tbody></tbody></table>' in https://github.com/Danielku15/Clusterize.js/tree/Danielku15-dom-mode fork.
      div.innerHTML = '<table><tbody>' + data + '</tbody></table>';

      const tbody = div.firstChild!.firstChild as HTMLElement;
      if (this._options.DOMMode) {
        for (let i = 0, ii = data.length; i < ii; i++) {
          tbody.appendChild(data[i]);
        }
      } else {
        tbody.innerHTML = data.join('');
      }

      while ((last = this._contentElem.lastChild)) {
        this._contentElem.removeChild(last);
      }

      const rowsNodes = this._getChildNodes(tbody);
      while (rowsNodes.length) {
        this._contentElem.appendChild(rowsNodes.shift()!);
      }
    } else {
      if (this._options.DOMMode) {
        while (this._contentElem.firstChild)
          this._contentElem.removeChild(this._contentElem.firstChild);

        for (let i = 0, ii = data.length; i < ii; i++) {
          this._contentElem.appendChild(data[i]);
        }
      } else {
        this._contentElem.innerHTML = data.join('');
      }
    }
  }

  private _getChildNodes(tag: HTMLElement) {
    this._debug(`getChildNodes with tag '%s'`, tag);
    const childNodes: Array<HTMLElement> = Array.from(
      tag.children
    ) as Array<HTMLElement>;
    const nodes: Array<HTMLElement> = [];
    for (let i = 0, ii = childNodes.length; i < ii; i++) {
      nodes.push(childNodes[i]);
    }
    return nodes;

    // WARNING, in fork it is only
    // return [].slice.call(tag.children);
  }

  private _checkChanges(type: string, value: any) {
    this._debug('Check changes of type %s.', type);

    const changed = value !== this._cache[type];
    this._cache[type] = value;
    return changed;
  }

  private _getStyle(prop: string, elem: HTMLElement) {
    return window.getComputedStyle
      ? window.getComputedStyle(elem)[prop as any]
      : // @ts-ignore
        elem.currentStyle[prop];
  }

  private _onScroll() {
    // fixes scrolling issue on Mac #3
    if (isMac) {
      if (!this._pointerEventsSet)
        this._contentElem.style.pointerEvents = 'none';

      this._pointerEventsSet = true;
      clearTimeout(this._scrollDebounce);

      this._scrollDebounce = setTimeout(() => {
        this._contentElem.style.pointerEvents = 'auto';
        this._pointerEventsSet = false;
      }, 50);
    }

    if (this._lastCluster !== (this._lastCluster = this._getClusterNum()))
      this._insertToDOM();

    this._options.callbacks &&
      this._options.callbacks.scrollingProgress &&
      this._options.callbacks.scrollingProgress(this.scrollProgress);
  }

  private _onResize() {
    clearTimeout(this._resizeDebounce);
    this._resizeDebounce = setTimeout(this.refresh.bind(this), 100);
  }
}
