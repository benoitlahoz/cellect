import type {
  AbstractCell,
  AbstractTableSelect,
  CellBounds,
  SelectionRect,
} from '../types';

export interface TableSelectionEvent extends CustomEvent {
  detail: {
    event: any;
    active: AbstractCell | undefined;
    selection: Set<AbstractCell>;
    bounds: CellBounds;
    rect: SelectionRect;
    selectedRows: Array<number>;
    selectedCols: Array<number>;
  };
}

export interface TableModifierEvent extends CustomEvent {
  detail: {
    //
  };
}

export class TableSelectEventSender {
  public static sendSelect(
    instance: AbstractTableSelect,
    originalEvent?: any,
    onlyActiveRect = false
  ): void {
    // Get selected rows and columns indexes.

    const selectedRows = Array.from(
      new Set(
        Array.from(instance.selection).map((cell: AbstractCell) => cell.row)
      )
    );

    const selectedCols = Array.from(
      new Set(
        Array.from(instance.selection).map((cell: AbstractCell) => cell.col)
      )
    );

    // Compute coordinates of the selection + active cell if alt modifier is pressed.
    instance.computeRect(instance.modifiersState.alt || onlyActiveRect);

    const event = new CustomEvent('select', {
      detail: {
        // Original event.
        event: originalEvent,
        active: instance.activeCell,
        selection: instance.selection,
        bounds: instance.selectionBounds,
        rect: instance.selectionRect,
        selectedRows,
        selectedCols,
      },
    }) as TableSelectionEvent;

    instance.element.dispatchEvent(event);
  }

  public static sendModifierChange(
    instance: AbstractTableSelect,
    originalEvent?: any
  ): void {
    const event = new CustomEvent('modifier-change', {
      detail: {
        event: originalEvent,
        contiguousModifier: instance.modifiersState.contiguous,
        altModifier: instance.modifiersState.alt,
      },
    });
  }
}
