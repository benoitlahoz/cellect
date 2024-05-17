import { onBeforeUnmount, onMounted, nextTick, ref } from 'vue';
import type { InjectionKey, Ref } from 'vue';
import { Cellect } from './modules';
import type { AbstractCellect, CellectOptions, SelectionRect } from './types';
import { CellCollection } from 'cell-collection';
import type {
  AbstractCell,
  AbstractCellCollection,
  CellBounds,
  CellIndex,
  CellRange,
  CellSize,
} from 'cell-collection';
import { CellectEventSender } from './modules/cellect-event.module';

export interface UseCellectReturn {
  selection: Ref<CellCollection>;
  focused: Ref<AbstractCell | undefined>;
  selectionBounds: Ref<CellBounds | undefined>;
  selectedRows: Ref<Array<number>>;
  selectedCols: Ref<Array<number>>;
  focusedRect: Ref<SelectionRect>;
  cellAtIndex: AbstractCellect['at'];
  selectOne: AbstractCellect['selectOne'];
  selectRange: AbstractCellect['selectRange'];
  selectRow: AbstractCellect['selectRow'];
  selectCol: AbstractCellect['selectCol'];
  selectAll: AbstractCellect['selectAll'];
  unselect: AbstractCellect['unselect'];

  lockSelection: AbstractCellect['lock'];
  unlockSelection: AbstractCellect['unlock'];
  isLocked: Ref<AbstractCellect['isLocked']>;

  contiguousModifier: Ref<boolean>;
  altModifier: Ref<boolean>;
  resetModifiers: AbstractCellect['resetModifiers'];

  computeFocusedRect: AbstractCellect['computeRect'];
  resetCells: () => void;
}

export interface UseCellect {
  (
    element: Ref<HTMLElement | undefined>,
    options: CellectOptions
  ): UseCellectReturn;
}

export const CellectKey: InjectionKey<UseCellectReturn> =
  Symbol('useTableSelect');

export const useCellect: UseCellect = (
  // The container element.
  element: Ref<HTMLElement | undefined>,
  // Options for the table selector.
  options: CellectOptions
) => {
  /**
   * The `TableSelect` instance.
   */
  let cellect: AbstractCellect;

  /**
   * The `TableSelect` current selection made reactive.
   */
  const selection: Ref<CellCollection> = ref(
    new CellCollection()
  ) as Ref<CellCollection>;

  /**
   * The current focused cell made reactive.
   */
  const focused: Ref<AbstractCell | undefined> = ref();

  /**
   * The current selection bounds made reactive.
   */
  const selectionBounds: Ref<CellBounds | undefined> = ref();

  /**
   * The current selectedRows made reactive.
   */
  const selectedRows: Ref<Array<number>> = ref([]);

  /**
   * The current selectedCols made reactive.
   */
  const selectedCols: Ref<Array<number>> = ref([]);

  /**
   * The current selection coordinates made reactive.
   */
  const focusedRect: Ref<SelectionRect> = ref({
    pos: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
  });

  /**
   * Current state of the contiguous modifier (e.g. 'Shift')
   */
  const contiguousModifier: Ref<boolean> = ref(false);

  /**
   * Current state of the alternate modifier (e.g. 'Command or Control')
   */
  const altModifier: Ref<boolean> = ref(false);

  /**
   * The current selection lock status made reactive.
   */
  const isLocked: Ref<boolean> = ref(false);
  onMounted(() => {
    if (element.value) {
      nextTick(() => {
        if (element.value) {
          cellect = new Cellect(element.value, options);
          element.value.addEventListener('select', onSelect as any);
          element.value.addEventListener('modifier-change', onModifier as any);
        }
      });
    }
  });

  onBeforeUnmount(() => {
    if (element.value) {
      element.value.removeEventListener('select', onSelect as any);
      element.value.removeEventListener('modifier-change', onModifier as any);
    }

    if (cellect) {
      cellect.dispose();
    }
  });

  const onSelect = (event: CustomEvent) => {
    selection.value = event.detail.selection;
    focused.value = event.detail.focused;
    selectionBounds.value = event.detail.bounds;
    selectedRows.value = event.detail.selectedRows;
    selectedCols.value = event.detail.selectedCols;
    focusedRect.value = event.detail.rect;
  };

  const onModifier = (event: CustomEvent) => {
    contiguousModifier.value = event.detail.contiguousModifier;
    altModifier.value = event.detail.altModifier;
  };

  const cellAtIndex = (row: number, col: number): AbstractCell | undefined => {
    return cellect.at(row, col);
  };

  const selectOne = (
    row: number,
    col: number,
    resetSelection = true,
    onlyActiveRect = true,
    active = true
  ): void => {
    if (cellect) {
      cellect.selectOne(row, col, resetSelection, onlyActiveRect, active);
    }
  };

  const selectRange = (
    ...args: (CellRange | CellBounds | AbstractCell | CellIndex | CellSize)[]
  ): CellCollection => {
    const selection = cellect.selectRange(...args) as CellCollection;

    // We trigger event from here, as it will not be triggered by the TableSelect.
    CellectEventSender.sendSelect(cellect);
    return selection;
  };

  const selectRow = (
    row: number,
    moveActive = true,
    resetSelection = true
  ): void => {
    cellect.selectRow(row, moveActive, resetSelection);
  };

  const selectCol = (col: number, resetSelection = true): void => {
    cellect.selectCol(col, resetSelection);
  };

  const selectAll = (activeAtFirst = false) => {
    cellect.selectAll(activeAtFirst);
  };

  const unselect = () => {
    return cellect.unselect() as AbstractCellCollection | AbstractCell | any;
  };

  const lockSelection = () => {
    cellect.lock();
    isLocked.value = cellect.isLocked;
  };

  const unlockSelection = () => {
    cellect.unlock();
    isLocked.value = cellect.isLocked;
  };

  const resetModifiers = () => {
    cellect.resetModifiers();
  };

  const computeFocusedRect = (focusedOnly = false) => {
    focusedRect.value = cellect.computeRect(focusedOnly);

    return focusedRect.value;
  };

  const resetCells = () => {
    cellect.element = element.value!;
  };

  return {
    selection,
    focused,
    selectionBounds,
    selectedRows,
    selectedCols,
    focusedRect,

    cellAtIndex,

    selectOne,
    selectRange,
    selectRow,
    selectCol,
    selectAll,
    unselect,

    lockSelection,
    unlockSelection,
    isLocked,

    contiguousModifier,
    altModifier,
    resetModifiers,

    computeFocusedRect,

    resetCells,
  };
};
