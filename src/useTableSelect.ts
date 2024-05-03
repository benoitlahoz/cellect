import {
  onBeforeUnmount,
  onMounted,
  nextTick,
  watch,
  ref,
  reactive,
  toRefs,
  computed,
  toRef,
} from 'vue';
import type { ReactiveEffect, Ref } from 'vue';
import { TableSelect } from './modules';
import type { CellIndex, SelectionRect } from './types';
import {
  AbstractTableSelect,
  TableSelectOptions,
  AbstractCell,
  CellBounds,
} from './types';

export const useTableSelect = (
  // The container element.
  element: Ref<HTMLElement | undefined>,
  // An array of arrays.
  data: Ref<Array<Array<any>>>,
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
  const selection: Ref<Set<any>> = ref(new Set());

  /**
   * The current active cell made reactive.
   */
  const activeCell: Ref<AbstractCell | undefined> = ref();

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
  const activeRect: Ref<SelectionRect> = ref({
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
          tableSelect = new TableSelect(element.value, data.value, options);
          element.value.addEventListener('select', onSelect as any);
          element.value.addEventListener('modifier-change', onModifier as any);

          enableDataWatcher();
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
    activeCell.value = event.detail.active;
    selectionBounds.value = event.detail.bounds;
    selectedRows.value = event.detail.selectedRows;
    selectedCols.value = event.detail.selectedCols;
    activeRect.value = event.detail.rect;
  };

  const onModifier = (event: CustomEvent) => {
    contiguousModifier.value = event.detail.contiguousModifier;
    altModifier.value = event.detail.altModifier;
  };

  const cellAtIndex = (row: number, col: number): AbstractCell | undefined => {
    if (tableSelect) {
      return tableSelect.cellAtIndex(row, col);
    }
    return;
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

  const selectRow = (
    row: number,
    moveActive = true,
    resetSelection = true
  ): void => {
    if (tableSelect) {
      tableSelect.selectRow(row, moveActive, resetSelection);
    }
  };

  const selectCol = (col: number, resetSelection = true): void => {
    if (tableSelect) {
      tableSelect.selectCol(col, resetSelection);
    }
  };

  const selectAll = (activeAtFirst = false) => {
    if (tableSelect) {
      tableSelect.selectAll(activeAtFirst);
    }
  };

  const selectRangeByIndex = (
    begin: CellIndex,
    end: CellIndex,
    send = true
  ): void => {
    if (tableSelect) {
      tableSelect.selectRangeByIndex(begin, end, send);
    }
  };

  const couldSelectRangeByIndex = (
    begin: CellIndex,
    end: CellIndex
  ): Set<AbstractCell> => {
    if (!tableSelect) {
      throw new Error('TableSelect is not instantiated yet.');
    }
    return tableSelect.couldSelectRangeByIndex(begin, end);
  };

  const resetSelection = (send = true) => {
    if (tableSelect) {
      tableSelect.resetSelection(send);
    }
  };

  const lockSelection = () => {
    if (tableSelect) {
      tableSelect.lock();
      isLocked.value = tableSelect.isLocked;
    }
  };

  const unlockSelection = () => {
    if (tableSelect) {
      tableSelect.unlock();
      isLocked.value = tableSelect.isLocked;
    }
  };

  const resetModifiers = () => {
    if (tableSelect) {
      tableSelect.resetModifiers();
    }
  };

  const computeActiveRect = (activeOnly = false) => {
    if (tableSelect) {
      activeRect.value = tableSelect.computeRect(activeOnly);
    }

    return activeRect.value;
  };

  /**
   * Watch for data change.
   */
  const enableDataWatcher = () => {
    watch(
      () => data,
      () => {
        nextTick(() => {
          if (tableSelect) {
            tableSelect.data = data.value;
          }
        });
      },
      {
        immediate: false,
        deep: options.resetOnChange,
      }
    );
  };

  return {
    selection,
    activeCell,
    selectionBounds,
    selectedRows,
    selectedCols,
    activeRect,

    cellAtIndex,

    selectOne,
    selectRow,
    selectCol,
    selectAll,
    selectRangeByIndex,
    couldSelectRangeByIndex,
    resetSelection,

    lockSelection,
    unlockSelection,
    isLocked,

    contiguousModifier,
    altModifier,
    resetModifiers,

    computeActiveRect,
  };
};
