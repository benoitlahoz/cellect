import { addClass, removeClass } from '../utils';
import {
  AbstractCell,
  CellBounds,
  CellIndex,
  CellOptions,
  CellRange,
  CellSize,
} from 'types/cell.abstract';

export class Cell implements AbstractCell {
  /**
   * Function to add the 'selected', 'active', ... classes to cell's element.
   */
  private _addSelectedClass;
  private _addActiveClass;
  /**
   * Function to remove a class from cell's element.
   */
  private _removeSelectedClass;
  private _removeActiveClass;

  private _pointerListener: EventListenerOrEventListenerObject | undefined;

  /**
   * Represents a cell of a table.
   *
   * @param { HTMLElement } _element The DOM element.
   * @param { CellRange } _range The range of the cell in rows and columns.
   * @param { any } _data The data associated to this cell.
   * @param  { CellOptions } _options The options to handle this cell.
   */
  constructor(
    private _element: HTMLElement,
    private _range: CellRange,
    private _options: CellOptions
  ) {
    this._element.setAttribute(
      'data-table-select-row',
      `${this._range.index.row}`
    );
    this._element.setAttribute(
      'data-table-select-col',
      `${this._range.index.col}`
    );
    this._element.setAttribute(
      'data-table-select-width',
      `${this._range.size.width}`
    );
    this._element.setAttribute(
      'data-table-select-height',
      `${this._range.size.height}`
    );

    this._addSelectedClass = addClass(this._options.selectedSelector);
    this._addActiveClass = addClass(this._options.activeSelector);

    this._removeSelectedClass = removeClass(this._options.selectedSelector);
    this._removeActiveClass = removeClass(this._options.activeSelector);
  }

  public dispose(): void {
    this.setActive(false);
    this.setSelected(false);
    this.removePointerListener();
  }

  public toggleSelect(): Cell {
    if (this.isSelected) {
      return this.setSelected();
    }

    return this.setSelected(false);
  }

  public toggleActive(): Cell {
    if (this.isActive) {
      return this.setActive();
    }

    return this.setActive(false);
  }

  public setActive(active = true): Cell {
    if (active) {
      this._addActiveClass(this._element);
    } else {
      this._removeActiveClass(this._element);
    }

    return this;
  }

  public setSelected(selected = true): Cell {
    if (selected) {
      this._addSelectedClass(this._element);
    } else {
      this._removeSelectedClass(this._element);
    }

    return this;
  }

  public addPointerListener(listener: EventListener): void {
    this._pointerListener = listener;
    this._element.addEventListener(
      this._options.pointerEventChannel,
      this._pointerListener!
    );
  }

  public removePointerListener(): void {
    if (this._pointerListener) {
      (this._element as HTMLElement).removeEventListener(
        this._options.pointerEventChannel,
        this._pointerListener
      );
    }
  }

  public get element(): HTMLElement {
    return this._element;
  }

  public get row(): number {
    return this._range.index.row;
  }

  public get col(): number {
    return this._range.index.col;
  }

  public get width(): number {
    return this._range.size.width;
  }

  public get height(): number {
    return this._range.size.height;
  }

  public get range(): CellRange {
    return this._range;
  }

  public get index(): CellIndex {
    return this._range.index;
  }

  public get size(): CellSize {
    return this._range.size;
  }

  public get boundingBox(): CellBounds {
    return {
      begin: {
        row: this.row,
        col: this.col,
      },
      end: {
        row: this.row + this.height - 1,
        col: this.col + this.width - 1,
      },
    };
  }

  public get isSelected(): boolean {
    return this._element.classList.contains(this._options.selectedSelector);
  }

  public get isActive(): boolean {
    return this._element.classList.contains(this._options.activeSelector);
  }
}
