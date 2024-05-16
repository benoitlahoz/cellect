import { describe, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import { TableSelect } from './table-select.module';

const dom = new JSDOM('http://localhost');

global.window = dom.window as any;
global.document = dom.window.document;
/*
Object.keys(global.window).forEach((property) => {
  if (typeof global[property] === 'undefined') {
    global[property] = global.window[property];
  }
});

global.Element = window.Element;
global.Image = window.Image;
// maybe more of: global.Whatever = window.Whatever
*/
global.navigator = {
  userAgent: 'mac',
} as any;

const SIZE = 10;

const element = document.createElement('div');
document.body.appendChild(element);
const data: Array<Array<any>> = [];

// Build data.
for (let row = 0; row < SIZE; row++) {
  const rowData: Array<any> = [];
  for (let col = 0; col < SIZE; col++) {
    rowData.push(col);
  }
  data.push(rowData);
}

// Build elements as Vue.js would with a 'v-for'.
for (let row = 0; row < data.length; row++) {
  const rowElement = document.createElement('div');
  rowElement.classList.add('row');
  element.appendChild(rowElement);

  for (let col = 0; col < data[row].length; col++) {
    const colElement = document.createElement('div');
    colElement.classList.add('col');
    rowElement.appendChild(colElement);
  }
}

describe('TableSelect', () => {
  const tableSelect = new TableSelect(element, {
    rowSelector: 'row',
    colSelector: 'col',
    selectedSelector: 'selected',
    focusSelector: 'focused',
  });

  test('should successfully subclass CellCollection', () => {
    expect(tableSelect).toBeDefined();
  });

  test('should be able to select cell', () => {
    expect(tableSelect.selectOne(0, 0)).not.toThrow();
    expect(tableSelect.selected.length).toBe(1);
  });
});
