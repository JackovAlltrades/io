import {html} from "../../../iocore.js";
import "../../app/app-collapsable/app-collapsable.js";
import "../../io/io-button/io-button.js";
import {IoObject} from "../../io/io-object/io-object.js";
import "../../io/io-object/io-object-prop.js";

export class ThreeInspectorGroup extends IoObject {
  static get style() {
    return html`
      <style>
        :host {
          display: flex;
          flex-direction: column;
          margin: 0.2em;
          border-radius: 0.1em;
          background: #333;
          line-height: 1em;
        }
        :host .io-wrapper {
          border-radius: 0.1em;
        }
        :host .io-row {
          display: flex;
          flex-direction: row;
          margin: 0.3em 0.3em 0 0.3em;
        }
        :host .io-row:last-of-type {
          margin-bottom: 0.3em;
        }
        :host .io-row > .io-label {
          width: 8em;
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 0.3em 0;
          padding-right: 0.5em;
        }
        :host .io-row > io-button {
          padding: 0.3em 0;
          color: #fd9;
          flex: none;
          font-weight: bold;

        }
        :host io-object-prop {
          flex: 1;
          display: flex;
        }
        :host io-option {
          display: inline-block;
          color: #ddd;
          background: #444;
          color: #ddd !important;
          border-radius: 0.2em;
          padding: 0.3em;
        }
        :host io-slider {
          border-radius: 0.2em;
          background: #444;
        }
        :host io-object-prop > three-matrix > io-object-prop > io-number {
          margin: 0 0.3em 0.3em 0;
        }
        :host io-object-prop > three-color > io-object-prop > io-number,
        :host io-object-prop > three-vector > io-object-prop:not(:last-of-type) > io-number {
          margin-right: 0.3em;
        }
        :host io-string,
        :host io-number {
          border-radius: 0.3em;
          background: #222;
          padding: 0.3em;
        }
        :host three-color-picker,
        :host io-boolean {
          padding: 0.3em;
          border-radius: 0.3em;
        }
        :host io-object-prop > io-boolean {
          flex: none;
        }
        :host three-color,
        :host io-slider,
        :host three-matrix {
          flex: 1;
        }
        :host io-boolean,
        :host io-string,
        :host three-vector,
        :host io-number {
          display: flex;
          color: #bef !important;
          flex: 1;
        }
        :host :focus {
          outline: 0;
          box-shadow: 0 0 0.5em #2ff;
        }
      </style>
    `;
  }
  static get properties() {
    return {
      value: {
        type: Object
      },
      props: {
        type: Array
      },
      label: {
        type: String
      },
      expanded: {
        type: Boolean,
        value: true
      }
    };
  }
  _clickHandler(value) {
    // TODO: consider bubbling event from button
    this.fire('io-link-clicked', {value: value});
  }
  update() {
    let propConfigs = this.getPropConfigs(this.props);
    const Prop = entry => ['div', {class: 'io-row'}, [
      ['span', {class: 'io-label'}, entry[0]],
      entry[1].tag !== 'io-object' ?
          ['io-object-prop', {key: entry[0], value: this.value, config: entry[1]}] :
          ['io-button', {action: this._clickHandler, value: this.value[entry[0]]}, this.value[entry[0]].constructor.name]
    ]];
    this.render([
      ['app-collapsable', {label: this.label, expanded: this.bind('expanded'), elements:
        Object.entries(propConfigs).map(Prop)
      }]
    ]);
  }
}

ThreeInspectorGroup.Register();
