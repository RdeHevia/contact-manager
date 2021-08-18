"use strict";
export class DOMSelector {
  contactsContainer() {
    return document.querySelector('#c_contacts');
  }

  noContactsMessage() {
    return document.querySelector('#no_contacts');
  }

  contactForm() {
    return document.querySelector('#contact_form');
  }

  contactLinks() {
    console.log([...document.querySelectorAll('a.add_contact')]);
    return [...document.querySelectorAll('a.add_contact')];
  }

  cancelButton() {
    return document.querySelector('#contact_form #cancel');
  }

  contactByDatasetContactId(id) {
    return document.querySelector(`[data-contact-id="${id}"]`);
  }

  newTagInput() {
    return document.querySelector('input.new_tag');
  }

  filteringTags() {
    return document.querySelector('#c_tags_filter');
  }

  searchBar() {
    return document.querySelector('#search');
  }
}