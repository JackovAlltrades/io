import {html, IoElement} from "../src/io.js";

export class IoDemo extends IoElement {
  static get style() {
    return html`<style>
      :host .demo {
        margin: 1em;
        padding: 0.5em;
        background: #eee;
      }
      :host .demoLabel {
        padding: 0.25em;
        margin: -0.5em -0.5em 0.5em -0.5em;
        background: #ccc;
      }
      :host .row > *  {
        flex: 1;
      }
      :host .row {
        display: flex;
        width: 22em;
      }
      :host .label {
        color: rgba(128, 122, 255, 0.75);
      }
      :host .padded {
        padding: 1em;
      }
      :host .sidebar {
        display: inline-block;
      }
      :host io-string,
      :host io-boolean,
      :host io-button,
      :host io-number {
        background-color: #ddd;
        margin: 1px;
      }

      :host io-menu-group {
        background: #fff;
      }
      :host io-menu-option {
        background-color: #ddd;
        margin: 1px;
      }
    </style>`;
  }
  static get properties() {
    return {
      number: 0,
      string: "hello",
      boolean: true,
      null: null,
      NaN: NaN,
      undefined: undefined
    };
  }
  setNumber(value) {
    this.number = value;
  }
  constructor() {
    super();
    this.object = {
      number: this.number,
      string: this.string,
      boolean: this.boolean,
      null: this.null,
      NaN: this.NaN,
      undefined: this.undefined
    }

    let suboptions2 = [
      {label: 'log one', value: 1, action: console.log},
      {label: 'log two', value: 2, action: console.log},
      {label: 'log three', value: 3, action: console.log},
      {label: 'log four', value: 4, action: console.log},
      {label: 'log five', value: 5, action: console.log}
    ];
    let suboptions1 = [
      {label: 'one more', options: suboptions2},
      {label: 'two more', options: suboptions2},
      {label: 'three more', options: suboptions2},
      {label: 'four more', options: suboptions2},
      {label: 'five more', options: suboptions2}
    ];
    let suboptions0 = [
      {label: 'one', options: suboptions1},
      {label: 'two', options: suboptions1},
      {label: 'three', options: suboptions1},
      {label: 'four', options: suboptions1},
      {label: 'five', options: suboptions1}
    ];
    let longOptions = [];
    for (let i = 0; i < 100; i++) {
      let r = Math.random();
      longOptions[i] = {label: String(r), value: r, action: console.log, icon: 'ξ', hint: 'log'};
    }
    this.menuoptions = [
      {label: 'file', options: suboptions0},
      {label: 'view', options: suboptions0},
      {label: 'long menu', options: longOptions, hint: 'list', icon: '⚠'}
    ];
    this.options = [
      {label: 'negative one', value: -1},
      {label: 'zero', value: 0},
      {label: 'one', value: 1},
      {label: 'two', value: 2},
      {label: 'three', value: 3},
      {label: 'four', value: 4},
      {label: 'leet', value: 1337},
    ];

    this.template([
      ['div', {className: 'demo'}, [
        ['div', {className: 'demoLabel'}, 'io-string / io-number / io-boolean'],
        ['div', {className: 'row label'}, [
          ['span'],
          ['span', 'io-string'],
          ['span', 'io-number'],
          ['span', 'io-boolean'],
        ]],
        ['div', {className: 'row'}, [
          ['div', {className: 'label'}, 'string'],
          ['io-string', {id: 'string', value: this.bind('string')}],
          ['io-number', {value: this.bind('string')}],
          ['io-boolean', {type: 'boolean', value: this.bind('string')}],
        ]],
        ['div', {className: 'row'}, [
          ['div', {className: 'label'}, 'number'],
          ['io-string', {value: this.bind('number')}],
          ['io-number', {id: 'number', value: this.bind('number')}],
          ['io-boolean', {type: 'boolean', value: this.bind('number')}],
        ]],
        ['div', {className: 'row'}, [
          ['div', {className: 'label'}, 'boolean'],
          ['io-string', {value: this.bind('boolean')}],
          ['io-number', {value: this.bind('boolean')}],
          ['io-boolean', {id: 'boolean', type: 'boolean', value: this.bind('boolean')}],
        ]],
        ['div', {className: 'row'}, [
          ['div', {className: 'label'}, 'NaN'],
          ['io-string', {value: this.bind('NaN')}],
          ['io-number', {value: this.bind('NaN')}],
          ['io-boolean', {type: 'boolean', value: this.bind('NaN')}],
        ]],
        ['div', {className: 'row'}, [
          ['div', {className: 'label'}, 'null'],
          ['io-string', {value: this.bind('null')}],
          ['io-number', {value: this.bind('null')}],
          ['io-boolean', {type: 'boolean', value: this.bind('null')}],
        ]],
        ['div', {className: 'row'}, [
          ['div', {className: 'label'}, 'undefined'],
          ['io-string', {value: this.bind('undefined')}],
          ['io-number', {value: this.bind('undefined')}],
          ['io-boolean', {type: 'boolean', value: this.bind('undefined')}],
        ]]
      ]],
      ['div', {className: 'demo slider'}, [
        ['div', {className: 'demoLabel'}, 'io-slider'],
        ['io-slider'],
      ]],
      ['div', {className: 'demo button'}, [
        ['div', {className: 'demoLabel'}, 'io-button'],
        ['io-button'],
        ['io-button', {label: 'set 0', action: this.setNumber, value: 0}],
        ['io-button', {label: 'set 1', action: this.setNumber, value: 1}],
        ['io-button', {label: 'set 2', action: this.setNumber, value: 2}],
        ['io-button', {label: 'set 3', action: this.setNumber, value: 3}],
      ]],
      ['div', {className: 'demo'}, [
        ['div', {className: 'demoLabel'}, 'io-object'],
        ['io-object', {value: [0,1,2,3], expanded: true, labeled: true}],
        ['io-object', {value: this.object, expanded: true, labeled: true}],
        ['io-object', {value: this.object, props: ['number'], config: {'number': ['io-number', {step: 0.0001}]}, expanded: true, labeled: true}],
      ]],
      ['div', {className: 'demo'}, [
        ['div', {className: 'demoLabel'}, 'io-inspector'],
        ['io-inspector', {value: this.object, groups: {'number': ['number']}, expanded: ['properties']}],
      ]],
      // TODO: array
      // TODO: object-group
      ['div', {className: 'demo'}, [
        ['div', {className: 'demoLabel'}, 'io-menu'],
        ['div', {className: 'label padded'}, 'right-click (contextmenu)'],
        ['io-menu', {options: this.menuoptions, position: 'pointer', listener: 'contextmenu'}]
      ]],
      ['div', {className: 'demo'}, [
        ['div', {className: 'demoLabel'}, 'io-menu-group'],
        ['io-menu-group', {className: 'sidebar', options: this.menuoptions}],
        ['div', {className: 'label'}, 'horizontal'],
        ['io-menu-group', {className: 'menubar', options: this.menuoptions, horizontal: true}],
      ]],
      ['div', {className: 'demo'}, [
        ['div', {className: 'demoLabel'}, 'io-menu-option'],
        ['div', {className: 'label'}, 'menu'],
        ['io-menu-option', {options: this.options, value: this.bind('number')}],
        ['div', {className: 'label'}, 'value'],
        ['io-number', {value: this.bind('number')}],
      ]],
    ]);
  }
}

IoDemo.Register();
