import { onBeforeUnmount, onMounted, nextTick, ref, watch } from 'vue';
import type { InjectionKey, Ref } from 'vue';
import { TableSelect } from './modules';
import type {
  AbstractTableSelect,
  TableSelectOptions,
  SelectionRect,
} from './types';
import { CellCollection } from 'cell-collection';
import type {
  AbstractCell,
  AbstractCellCollection,
  CellBounds,
  CellIndex,
  CellRange,
  CellSize,
} from 'cell-collection';
import { TableSelectEventSender } from './modules/table-select-event.module';

export interface UseTableSelectReturn {
  selection: Ref<CellCollection>;
  focused: Ref<AbstractCell | undefined>;
  selectionBounds: Ref<CellBounds | undefined>;
  selectedRows: Ref<Array<number>>;
  selectedCols: Ref<Array<number>>;
  focusedRect: Ref<SelectionRect>;
  cellAtIndex: AbstractTableSelect['at'];
  selectOne: AbstractTableSelect['selectOne'];
  selectRange: AbstractTableSelect['selectRange'];
  selectRow: AbstractTableSelect['selectRow'];
  selectCol: AbstractTableSelect['selectCol'];
  selectAll: AbstractTableSelect['selectAll'];
  unselect: AbstractTableSelect['unselect'];

  lockSelection: AbstractTableSelect['lock'];
  unlockSelection: AbstractTableSelect['unlock'];
  isLocked: Ref<AbstractTableSelect['isLocked']>;

  contiguousModifier: Ref<boolean>;
  altModifier: Ref<boolean>;
  resetModifiers: AbstractTableSelect['resetModifiers'];

  computeFocusedRect: AbstractTableSelect['computeRect'];
  resetCells: () => void;
}

export interface UseTableSelect {
  (
    element: Ref<HTMLElement | undefined>,
    options: TableSelectOptions
  ): UseTableSelectReturn;
}

export const TableSelectKey: InjectionKey<UseTableSelectReturn> =
  Symbol('useTableSelect');

export const useTableSelect: UseTableSelect = (
  // The container element.
  element: Ref<HTMLElement | undefined>,
  // Options for the table selector.
  options: TableSelectOptions
) => {
  /**
   * The `TableSelect` instance.
   */
  let tableSelect: AbstractTableSelect;

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
          tableSelect = new TableSelect(element.value, options);
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

    if (tableSelect) {
      tableSelect.dispose();
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
    return tableSelect.at(row, col);
  };

  const selectOne = (
    row: number,
    col: number,
    resetSelection = true,
    onlyActiveRect = true,
    active = true
  ): void => {
    if (tableSelect) {
      tableSelect.selectOne(row, col, resetSelection, onlyActiveRect, active);
    }
  };

  const selectRange = (
    ...args: (CellRange | CellBounds | AbstractCell | CellIndex | CellSize)[]
  ): CellCollection => {
    const selection = tableSelect.selectRange(...args) as CellCollection;

    // We trigger event from here, as it will not be triggered by the TableSelect.
    TableSelectEventSender.sendSelect(tableSelect);
    return selection;
  };

  const selectRow = (
    row: number,
    moveActive = true,
    resetSelection = true
  ): void => {
    tableSelect.selectRow(row, moveActive, resetSelection);
  };

  const selectCol = (col: number, resetSelection = true): void => {
    tableSelect.selectCol(col, resetSelection);
  };

  const selectAll = (activeAtFirst = false) => {
    tableSelect.selectAll(activeAtFirst);
  };

  const unselect = () => {
    return tableSelect.unselect() as
      | AbstractCellCollection
      | AbstractCell
      | any;
  };

  const lockSelection = () => {
    tableSelect.lock();
    isLocked.value = tableSelect.isLocked;
  };

  const unlockSelection = () => {
    tableSelect.unlock();
    isLocked.value = tableSelect.isLocked;
  };

  const resetModifiers = () => {
    tableSelect.resetModifiers();
  };

  const computeFocusedRect = (focusedOnly = false) => {
    focusedRect.value = tableSelect.computeRect(focusedOnly);

    return focusedRect.value;
  };

  const resetCells = () => {
    tableSelect.element = element.value!;
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
