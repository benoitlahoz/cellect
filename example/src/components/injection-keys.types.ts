import type { InjectionKey, Ref } from 'vue';
import type { UseTableSelectReturn } from '../../../src/useTableSelect';

export const TableSelectKey: InjectionKey<UseTableSelectReturn> =
  Symbol('UseTableSelect');
