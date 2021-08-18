"use strict";
export class API {
  fetchContacts() {
    return this.get('/api/contacts');
  }

  async get(path) {
    let response = await fetch(path);

    return this.handleResponse(response);
  }

  async post(path, json) {
    let config = {
      method: 'POST',
      headers: {"Content-Type": "application/json"},
      body: json
    };

    let response = await fetch(path, config);

    return this.handleResponse(response);
  }

  async put(path, json) {
    let config = {
      method: 'PUT',
      headers: {"Content-Type": "application/json"},
      body: json
    };

    let response = await fetch(path, config);

    return this.handleResponse(response);
  }

  async delete(path) {
    let config = {method: 'DELETE'};
    let response = await fetch(path, config);
    return this.isSuccessful(response);
  }

  handleResponse(response) {
    if (this.isSuccessful(response)) {
      return response.json();
    } else {
      console.log(`${response.status} (${response.statusText})`);
      return undefined;
    }
  }

  isSuccessful(response) {
    let statusCode = response.status;
    return statusCode >= 200 && statusCode <= 299;
  }
}