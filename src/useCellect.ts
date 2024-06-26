import { onBeforeUnmount, nextTick, ref, watch } from 'vue';
import type { InjectionKey, Ref, Component } from 'vue';
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
import { useDebug } from './utils';

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
    element: Ref<HTMLElement | Component | undefined>,
    options: CellectOptions
  ): UseCellectReturn;
}

export const CellectKey: InjectionKey<UseCellectReturn> = Symbol('useCellect');

export const useCellect: UseCellect = (
  // The container element or component.
  target: Ref<HTMLElement | Component | undefined>,
  // Options for the table selector.
  options: CellectOptions
) => {
  /**
   *
   */
  const element: Ref<HTMLElement | undefined> = ref();
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

  /**
   * Debug funcction (NoOp at launch)
   */

  let debug = (..._: any[]) => {};

  watch(
    () => target.value,
    () => {
      if (!element.value && target.value) {
        if (process.env.NODE_ENV === 'development' && options.debug === true) {
          debug = useDebug('useCellect');
        }

        debug(`Target's value changed`, target.value);

        nextTick(() => {
          if (target.value && typeof target.value !== 'undefined') {
            debug(`Target's value is defined.`);
            debug(
              `Target's value is a component: %s.'`,
              typeof (target.value as any).$el !== 'undefined'
            );

            element.value = (target.value as any).$el
              ? (target.value as any).$el
              : target.value;

            debug(`Element's value is now`, element.value);

            cellect = new Cellect(element.value as HTMLElement, options);

            (element.value as HTMLElement).addEventListener(
              'select',
              onSelect as any
            );
            (element.value as HTMLElement).addEventListener(
              'modifier-change',
              onModifier as any
            );
          }
        });
      }
    },
    { immediate: true, deep: true }
  );
  /*
  onMounted(() => {
    if (target.value) {
      nextTick(() => {
        if (target.value && typeof target.value !== 'undefined') {
          element.value = (target.value as any).$el
            ? (target.value as any).$el
            : target.value;

          cellect = new Cellect(element.value as HTMLElement, options);
          (element.value as HTMLElement).addEventListener(
            'select',
            onSelect as any
          );
          (element.value as HTMLElement).addEventListener(
            'modifier-change',
            onModifier as any
          );
        }
      });
    }
  });
  */
  onBeforeUnmount(() => {
    debug(`Will unmount.`);

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
    cellect.selectOne(row, col, resetSelection, onlyActiveRect, active);
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
    debug('Target element will reset.');
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
