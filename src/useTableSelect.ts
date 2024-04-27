import { onBeforeUnmount, onMounted, nextTick, watch, ref } from 'vue';
import type { Ref } from 'vue';
import { TableSelect } from './modules';
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

  onMounted(() => {
    if (element.value) {
      nextTick(() => {
        if (element.value) {
          tableSelect = new TableSelect(element.value, data.value, options);
          element.value.addEventListener('select', onSelect as any);

          enableDataWatcher();
        }
      });
    }
  });

  onBeforeUnmount(() => {
    if (element.value) {
      element.value.removeEventListener('select', onSelect as any);
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
  };

  const selectAll = () => {
    if (tableSelect) {
      // tableSelect.selectAll();
    }
  };

  const resetSelection = () => {
    if (tableSelect) {
      tableSelect.resetSelection();
    }
  };

  /**
   * Watch for data once the `TableSelect` is created.
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
        immediate: true,
        deep: true,
      }
    );
  };

  return {
    selection,
    activeCell,
    selectionBounds,
    selectedRows,
    selectedCols,

    resetSelection,
  };
};
