/* eslint-disable max-statements */
"use strict";
/*
===============================================================
CONTACT MANAGER APP

READ ME:
===============================================================
ORGANIZATION:
  1. UI
    1.1. API
    1.2. ViewModel
      1.2.1. Template
      1.2.2. DOMSelector
===============================================================
RESPONSABILITIES:
UI:
  - event handling
  - orchestrate API and ViewModel
API:
  - communicate with the backend
ViewModel:
  - UI state organized by components. Each component has:
    - data
    - reference to associated element in DOM
  - CRUD operations on UI state
  - CRUD operations on DOM
  - Uses Template and DOMSelector as colaborators
Template:
  - Manage Handlebars templates
  - generate HTML from templates
DOMSelector:
  - methods that return references to DOM elements
===============================================================
*/

import {API} from './api.js';
import {Template} from './template.js';
import {DOMSelector} from './DOMselector.js';

class UI {
  constructor() {
    this.api = new API();
    this.viewmodel = new ViewModel();
  }

  async load () {
    this.viewmodel.template.initializeTemplates();

    let contacts = await this.api.fetchContacts();
    let tags = this.viewmodel.extractTagsFromContacts(contacts);
    this.viewmodel.insertContacts(contacts);
    this.viewmodel.bindDataToAllContactElements(contacts);
    this.viewmodel.displayOrHideNoContactsMessage();
    this.viewmodel.insertTags(tags);
    this.viewmodel.bindDataToAllTagElements(tags);
  }

  bindListeners() {
    this.bindListenerToNewTagLink();
    this.bindListenerToAddContactLinks();
    this.bindListenerToContactForm();
    this.bindListenerToCancelButton();
    this.bindListenerToContactsContainer();
    this.bindListenerToFilteringTags();
    this.bindListenerToSearch();
  }

  bindListenerToNewTagLink() {
    let newTagLink = document.querySelector('a.new_tag');
    newTagLink.addEventListener('click', event => this.handleNewTag(event));
  }

  bindListenerToAddContactLinks() {
    this.viewmodel.select.contactLinks().forEach(link => {
      link.addEventListener('click', event => this.handleShowContactForm(event));
    });
  }

  bindListenerToCancelButton() {
    let cancelButton = this.viewmodel.select.cancelButton();
    cancelButton.addEventListener('click', event => this.handleCancelButton(event));
  }

  bindListenerToContactForm() {
    let contactForm = this.viewmodel.select.contactForm();
    contactForm.addEventListener('submit', event => this.handleContact(event));
  }

  bindListenerToContactsContainer() {
    let contactsContainer = this.viewmodel.select.contactsContainer();
    contactsContainer.addEventListener('click', event => {
      this.handleEditOrDeleteContact(event);
    });
  }

  bindListenerToFilteringTags() {
    let filteringTags = this.viewmodel.select.filteringTags();
    filteringTags.addEventListener('input', event => {
      this.handleTagFiltering(event);
    });
  }

  bindListenerToSearch() {
    let search = this.viewmodel.select.searchBar();

    search.addEventListener('input', event => this.handleSearch(event));
  }

  handleNewTag(event) {
    event.preventDefault();

    let newTag = this.viewmodel.select.newTagInput().value;
    this.viewmodel.select.newTagInput().value = '';
    this.viewmodel.insertTag(newTag);
    this.viewmodel.bindDataToTagElement(newTag);
  }

  handleShowContactForm(event) {
    event.preventDefault();

    this.viewmodel.hide(this.viewmodel.select.contactsContainer());
    this.viewmodel.unhide(this.viewmodel.select.contactForm());
  }

  handleCancelButton(event) {
    event.preventDefault();
    let contactForm = this.viewmodel.select.contactForm();
    contactForm.reset();
    this.viewmodel.hide(contactForm);
    this.viewmodel.unhide(this.viewmodel.select.contactsContainer());
  }

  handleContact(event) {
    event.preventDefault();
    let form = event.target;

    if (form.dataset.putOverride === "true") {
      this.handleEditContact();
    } else {
      this.handleNewContact(form);
    }
    form.reset();
    this.viewmodel.hide(form);
    this.viewmodel.unhide(this.viewmodel.select.contactsContainer());
  }

  async handleNewContact(contactForm) {
    let path = contactForm.action;
    let json = this.serializeContactFormToJSON();

    let newContact = await this.api.post(path, json);
    if (!newContact) return;

    this.viewmodel.insertContact(newContact);
    this.viewmodel.bindDataToContactElement(newContact);
  }

  async handleEditContact() {
    let contactForm = this.viewmodel.select.contactForm();

    let path = contactForm.dataset.putAction;
    let json = this.serializeContactFormToJSON();
    contactForm.reset();

    let editedContact = await this.api.put(path, json);
    if (!editedContact) return;

    this.viewmodel.updateContact(editedContact);
  }

  async handleEditOrDeleteContact(event) {
    event.preventDefault();
    if (event.target.tagName !== 'A') return;
    if (this.viewmodel.select.contactLinks().includes(event.target)) return;

    let method = event.target.dataset.method;
    let path = event.target.href;
    let contactId = +path.match(/[0-9]+$/)[0];

    if (method === 'PUT') {
      this.viewmodel.configContactForm(method, path);
      this.viewmodel.populateContactForm(contactId);
      this.viewmodel.hide(this.viewmodel.select.contactsContainer());
      this.viewmodel.unhide(this.viewmodel.select.contactForm());
    } else if (method === 'DELETE') {
      if (!confirm('Do you want to delete the contact?')) return;
      let success = await this.api.delete(path);
      if (!success) return;
      this.viewmodel.deleteContact(contactId);
      this.viewmodel.displayOrHideNoContactsMessage();
    }
  }

  handleTagFiltering(event) {
    event.preventDefault();

    let id = event.target.value;
    let checked = JSON.parse(event.target.checked);

    this.viewmodel.updateTagCheckStatus(id, checked);

    this.viewmodel.filterContacts();
  }

  handleSearch(event) {
    event.preventDefault();
    let search = event.target.value.toLowerCase();
    this.viewmodel.searchString = search;

    this.viewmodel.filterContacts();
  }

  serializeContactFormToJSON() {
    let contactForm = this.viewmodel.select.contactForm();
    let entries = [...new FormData(contactForm)];
    let tagEntries = entries.filter(entry => entry[0] === 'tag');
    let restEntries = entries.filter(entry => entry[0] !== 'tag');
    let tagsEntry = tagEntries.reduce((formatedEntry, entry, idx) => {
      if (idx === 0) {
        formatedEntry[1] += `${entry[1]}`;
      } else {
        formatedEntry[1] += `,${entry[1]}`;
      }
      return formatedEntry;
    }, ["tags", ""]);

    let formatedEntries = [...restEntries, tagsEntry];
    return JSON.stringify(Object.fromEntries(formatedEntries));
  }
}

class ViewModel {
  constructor() {
    this.template = new Template();
    this.select = new DOMSelector();
    this.contacts = {};
    this.tags = {};
    this.searchString = '';
  }

  insertContacts(contacts) {
    let formatedData = {contacts};
    let html = this.template.generateHTMLFromTemplate('t_contacts', formatedData);
    let container = this.select.contactsContainer();
    container.insertAdjacentHTML('beforeend', html);
  }

  insertContact(contact) {
    let formatedData = contact;
    let html = this.template.generateHTMLFromTemplate('t_contact', formatedData);
    let container = this.select.contactsContainer();
    container.insertAdjacentHTML('beforeend', html);
  }

  updateContact(contactData) {
    let formatedData = contactData;
    let id = formatedData.id;
    let contact = this.contacts[id];
    contact.data = formatedData;
    this.regenerateContentContact(id);
  }

  deleteContact(contactId) {
    this.contacts[contactId].element.remove();
    delete this.contacts[contactId];
  }

  regenerateContentContact(id) {
    let contactData = this.contacts[id].data;
    let contactElement = this.contacts[id].element;
    this.template.empty(contactElement);

    let innerHTML = this.template
      .generateHTMLFromTemplate('t_contact_innerHTML', contactData);

    contactElement.insertAdjacentHTML('beforeend', innerHTML);
  }

  displayOrHideNoContactsMessage() {
    if (JSON.stringify(this.contacts) === '{}') {
      this.unhide(this.select.noContactsMessage());
    } else {
      this.hide(this.select.noContactsMessage());
    }
  }

  extractTagsFromContacts(contacts) {
    let tags = contacts.reduce((tagsFound, contact) => {
      if (!contact.tags) return tagsFound;

      let contactTags = contact.tags.split(',');
      contactTags.forEach(contactTag => {
        if (!tagsFound.includes(contactTag)) tagsFound.push(contactTag);
      });

      return tagsFound;
    }, []);

    return tags;
  }

  insertTags(tags) {
    let formatedData = {tags: tags.map(tag => {
      return {name: tag};
    })};

    let html = this.template.generateHTMLFromTemplate('t_tags', formatedData);
    let containerFilter = document.querySelector('#c_tags_filter');
    let containerForm = document.querySelector('#c_tags_contact_form');
    containerFilter.insertAdjacentHTML('beforeend', html);
    containerForm.insertAdjacentHTML('beforeend', html);
  }

  insertTag(tag) {
    let formatedData = {name: tag};
    let html = this.template.generateHTMLFromTemplate('t_tag', formatedData);

    let containerFilter = document.querySelector('#c_tags_filter');
    let containerForm = document.querySelector('#c_tags_contact_form');

    containerFilter.insertAdjacentHTML('beforeend', html);
    containerForm.insertAdjacentHTML('beforeend', html);
  }

  updateTagCheckStatus(id, checked) {
    this.tags[id].checked = checked;
  }

  bindDataToAllContactElements(contactsData) {
    contactsData.forEach(contactData => {
      this.bindDataToContactElement(contactData);
    });
    console.log(this);
  }

  bindDataToContactElement(contactData) {
    let id = contactData.id;
    if (this.contacts.hasOwnProperty(id)) {
      this.contacts[id].data = contactData;
    } else {
      let contactElement = this.select.contactByDatasetContactId(id);
      this.contacts[id] = {element: contactElement, data: contactData};
    }
  }

  bindDataToAllTagElements(tagsData) {
    tagsData.forEach(tagData => this.bindDataToTagElement(tagData));

  }

  bindDataToTagElement(tagData) {
    let id = tagData;
    let tagElements = [...document.querySelectorAll(`[data-tag-id="${id}"]`)];
    this.tags[id] = {elements: tagElements, data: tagData, checked: false};
  }

  filterContacts() {
    let contactElementsFilteredByTag =
      this.findContactElementsWithCheckedTags();
    let contactElementsFilteredBySearch = this.findContactElementsBySearch();

    let contactElementsThatPassBothFilters =
      contactElementsFilteredByTag.reduce((filteredElements, element) => {
        if (contactElementsFilteredBySearch.includes(element)) {
          filteredElements.push(element);
        }
        return filteredElements;
      }, []);

    this.showOnlyContacts(...contactElementsThatPassBothFilters);
  }

  findContactElementsWithCheckedTags() {
    let checkedTags = Object.values(this.tags).reduce((names, tag) => {
      let name = tag.data;
      if (tag.checked) names.push(name);
      return names;
    }, []);

    let contactElementsFiltered = Object.values(this.contacts)
      .reduce((elements, contact) => {
        if (!contact.data.tags) return elements;

        let contactTags = contact.data.tags.split(',');
        if (checkedTags.every(checkedTag => contactTags.includes(checkedTag))) {
          elements.push(contact.element);
        }

        return elements;
      }, []);

    return contactElementsFiltered;
  }

  findContactElementsBySearch() {
    let searchRegex = new RegExp(`^${this.searchString}`,'i');

    let contactElementsFiltered = Object.values(this.contacts)
      .reduce((elements, contact) => {
        if (contact.data.full_name.match(searchRegex)) {
          elements.push(contact.element);
        }

        return elements;
      }, []);

    return contactElementsFiltered;
  }

  showOnlyContacts(...contactElements) {
    Object.values(this.contacts).forEach(contact => {
      if (contactElements.includes(contact.element)) {
        this.unhide(contact.element);
      } else {
        this.hide(contact.element);
      }
    });
  }

  hide(element) {
    element.classList.add('hidden');
    element.classList.remove('show');
  }

  unhide(element) {
    element.classList.add('show');
    element.classList.remove('hidden');
  }

  configContactForm(method, path = undefined) {
    let contactForm = this.select.contactForm();
    switch (method) {
      case 'POST':
        contactForm.dataset.putOverride = false;
        contactForm.dataset.putAction = "";
        break;
      case 'PUT':
        contactForm.dataset.putOverride = true;
        contactForm.dataset.putAction = path;
        break;
    }
  }

  populateContactForm(contactId) {
    let contactData = this.contacts[contactId].data;
    let contactForm = this.select.contactForm();
    let inputs = [...contactForm.querySelectorAll('input')];

    inputs.forEach(input => {
      if (input.type !== 'checkbox') {
        input.value = contactData[input.name];
      } else if (input.type === 'checkbox' && contactData.tags) {
        if (contactData.tags.split(',').includes(input.value)) {
          input.checked = true;
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let contactManagerUI = new UI();
  contactManagerUI.load();
  contactManagerUI.bindListeners();
});