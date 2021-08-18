"use strict";
export class Template {
  constructor() {
    this.templates = {};
  }

  initializeTemplates() {
    let templates = [...document.querySelectorAll('script[type="text/x-handlebars"]')];
    templates.forEach(template => {
      this.compileTemplate(template);
      this.registerAsPartial(template);
    });
  }

  compileTemplate(template) {
    let id = template.id;
    this.templates[id] = Handlebars.compile(template.innerHTML);
  }

  registerAsPartial(template) {
    let id = template.id;
    Handlebars.registerPartial(id, template.innerHTML);
  }

  getTemplate(templateId) {
    return this.templates[templateId];
  }

  generateHTMLFromTemplate(templateId, data) {
    let template = this.getTemplate(templateId);
    return template(data);
  }

  empty(container) {
    if (!container.children) return;

    [...container.childNodes].forEach(child => child.remove());
  }
}