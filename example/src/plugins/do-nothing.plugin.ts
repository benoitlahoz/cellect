import { Ref } from 'vue';
import { AbstractCellect, AbstractCellectPlugin } from '../../../src/types';
import { Clusterize } from './clusterize';

export class DoNothingPlugin extends AbstractCellectPlugin {
  private _clusterize: Clusterize | undefined;

  private _options: Record<string, any>;

  private _scrollElement: Ref<HTMLElement | undefined>;
  private _contentElement: Ref<HTMLElement | undefined>;

  constructor(options: Record<string, any>) {
    super();
    ``;
    this._options = options;

    this._scrollElement = options.scrollElement;
    this._contentElement = options.contentElement;
  }

  public beforeInit(instance: AbstractCellect): void {
    console.log('Before init', instance);
  }
  public inited(instance: AbstractCellect): void {
    console.log(
      'Inited',
      Array.from(instance),
      instance.elements,
      instance.element
    );
  }

  public beforeSelect(instance: AbstractCellect): void {
    console.log('Before select', instance);
  }
  public selected(instance: AbstractCellect): void {
    console.log('Selected', instance);
  }

  public beforeUnselect(instance: AbstractCellect): void {
    console.log('Before unselect', instance);
  }
  public unselected(instance: AbstractCellect): void {
    console.log('Unselected', instance);
  }

  public beforeElementChange(
    instance: AbstractCellect,
    element: HTMLElement
  ): void {
    console.log('Before element change', instance, element);
  }
  public elementChanged(instance: AbstractCellect, element: HTMLElement): void {
    console.log('Element changed', instance, element);
    if (this._clusterize) {
      this._clusterize.destroy();
      this._clusterize = undefined;
    }

    this._clusterize = new Clusterize({
      scrollElement: this._scrollElement.value,
      contentElement: this._contentElement.value,
      DOMMode: this._options.DOMMode,
      debug: this._options.debug,
    });
  }

  public dispose(): void {
    console.log('Dispose plugin.');
    if (this._clusterize) {
      this._clusterize.destroy();
      this._clusterize = undefined;
    }
  }
}
