import {html, IoElement, IoStorage as $, filterObject} from "../../io.js";

export class IoSidebar extends IoElement {
  static get Style() {
    return html`<style>
      :host {
        display: flex;
        flex-wrap: nowrap;
        overflow-x: hidden;
        overflow-y: auto;
        padding: var(--io-spacing);
      }
      :host:not([overflow]) {
        -webkit-overflow-scrolling: touch;
        flex-direction: column;
      }
      :host io-boolean,
      :host io-button,
      :host io-collapsable {
        width: 100%; /* Prevents layout trashing when overflown */
      }
      :host io-collapsable,
      :host io-boolean,
      :host .io-frame,
      :host io-button {
        flex: 0 0 auto;
        margin: 0;
        padding: var(--io-spacing);
        border: none;
        background: none;
        box-shadow: none;
      }
      :host .io-frame {
        padding-left: 1em;
      }
      :host io-button.io-selected-tab {
        color: var(--io-color-link);
        text-decoration: underline;
      }
    </style>`;
  }
  static get Attributes() {
    return {
      role: 'navigation',
      label: {
        notify: true,
      },
      overflow: {
        notify: true,
      }
    };
  }
  static get Properties() {
    return {
      selected: String,
      options: Array,
    };
  }
  _onSelect(id) {
    this.set('selected', id);
  }
  _onValueSet(event) {
    this.set('selected', event.detail.value);
  }
  _addOptions(options) {
    const elements = [];
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      if (option.options) {
        const UID = option.label + ' ' + i + '/' + options.length + ' (' + option.options.length + ')';
        elements.push(['io-collapsable', {
          label: option.label,
          expanded: $('io-sidebar-collapse ' + UID, false),
          elements: [...this._addOptions(option.options)]
        }]);
      } else {
        const selected = this.selected && (this.selected === option || this.selected === option.value);
        elements.push(['io-button', {
          label: option.label || option.value || option,
          value: option.value || option,
          action: this._onSelect,
          class: (selected ? 'io-selected-tab' : ''),
        }]);
      }
    }
    return elements;
  }
  changed() {
    let selectedOption = filterObject(this.options, option => { return option.value === this.selected; });
    if (this.overflow) {
      const label = selectedOption ? (selectedOption.label || String(selectedOption.value)) : String(this.selected).split('#')[0];
      this.template([['io-option', {
        label: '☰  ' + label,
        title: 'select tab',
        value: this.selected,
        options: this.options,
        class: 'io-item',
        'on-value-set': this._onValueSet,
      }]]);
    } else {
      this.template([...this._addOptions(this.options)]);
    }
  }
}

IoSidebar.Register();
