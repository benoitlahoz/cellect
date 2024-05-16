import type { InjectionKey } from 'vue';
import type { UseTableSelectReturn } from '../../src/useTableSelect';
import { UseStyle } from './use/useStyle';

export const UseStyleKey: InjectionKey<UseStyle> = Symbol('useStyle');
