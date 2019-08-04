import {IoElement} from "../../dist/io.js";
import {IoMdView} from "../../dist/io-elements-extras.js";

export class TodoInfo extends IoMdView {
  changed() {
    this.parseMarkdown(`
Double-click to edit a todo

Created by [Aki Rodić](https://akirodic.com)

Part of [TodoMVC](http://todomvc.com/)
    `);
  }
}

TodoInfo.Register();
