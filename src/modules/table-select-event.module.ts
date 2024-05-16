import type {
  AbstractCell,
  AbstractCellCollection,
  CellBounds,
} from 'cell-collection';
import type { AbstractTableSelect, SelectionRect } from '../types';

export interface TableSelectionEvent extends CustomEvent {
  detail: {
    event: any;
    focused: AbstractCell | undefined;
    selection: AbstractCellCollection;
    bounds: CellBounds;
    rect: SelectionRect;
    selectedRows: Array<number>;
    selectedCols: Array<number>;
  };
}

export interface TableModifierEvent extends CustomEvent {
  detail: {
    event: Event;
    contiguousModifier: boolean;
    altModifier: boolean;
  };
}

export class TableSelectEventSender {
  public static sendSelect(
    instance: AbstractTableSelect,
    originalEvent?: any,
    onlyActiveRect = false
  ): void {
    // Get selected rows and columns indexes.

    const selectedRows = Array.from(instance.selection).map(
      (cell: AbstractCell) => cell.row
    );

    const selectedCols = Array.from(instance.selection).map(
      (cell: AbstractCell) => cell.col
    );

    // Compute coordinates of the selection + active cell if alt modifier is pressed.
    instance.computeRect(instance.modifiersState.alt || onlyActiveRect);

    const event: TableSelectionEvent = new CustomEvent('select', {
      detail: {
        // Original event.
        event: originalEvent,
        focused: instance.selection.focused,
        selection: instance.selection,
        bounds: instance.selection.bounds,
        rect: instance.selectionRect,
        selectedRows,
        selectedCols,
      },
    }); // as TableSelectionEvent;

    instance.element.dispatchEvent(event);
  }

  public static sendModifierChange(
    instance: AbstractTableSelect,
    originalEvent?: any
  ): void {
    const event: TableModifierEvent = new CustomEvent('modifier-change', {
      detail: {
        event: originalEvent,
        contiguousModifier: instance.modifiersState.contiguous,
        altModifier: instance.modifiersState.alt,
      },
    });

    instance.element.dispatchEvent(event);
  }
}
