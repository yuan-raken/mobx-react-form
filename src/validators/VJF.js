import _isBoolean from 'lodash/isBoolean';
import _isArray from 'lodash/isArray';
import _isFunction from 'lodash/isFunction';
import _isString from 'lodash/isString';
import _isPlainObject from 'lodash/isPlainObject';

import { toJS } from 'mobx';
import { isPromise } from '../utils';

/**
  Vanilla JavaScript Functions
*/
export default class VJF {

  validator = null;

  options;

  constructor(plugin, { promises = [], options = {} }) {
    if (_isPlainObject(plugin)) {
      this.validator = plugin;
    }

    this.promises = promises;
    this.options = options;
  }

  validateField(field, form) {
    // exit if field does not have validation functions
    if (!field.validators) return;

    // get validators from validate property
    const $fn = toJS(field.validators);

    // map only if is an array of validator functions
    if (_isArray($fn)) {
      $fn.map(fn => this.collectData(fn, field, form));
    }

    // it's just one function
    if (_isFunction($fn)) {
      this.collectData($fn, field, form);
    }

    // execute the function validation
    this.executeValidation(field);
  }

  collectData($fn, field, form) {
    const res = this.handleFunctionResult($fn, field, form);

    // check and execute only if is a promise
    if (isPromise(res)) {
      const $p = res
        .then($res => field.setValidationAsyncData($res[0], $res[1]))
        .then(() => this.executeAsyncValidation(field))
        .then(() => field.showAsyncErrors());

      // push the promise into array
      this.promises.push($p);
      return;
    }

    // is a plain function
    field.validationFunctionsData.unshift({
      valid: res[0],
      message: res[1],
    });
  }

  executeValidation(field) {
    // otherwise find an error message to show
    field.validationFunctionsData
      .map(rule => (rule.valid === false)
        && field.invalidate(rule.message));
  }

  executeAsyncValidation(field) {
    if (field.validationAsyncData.valid === false) {
      field.invalidate(field.validationAsyncData.message, true);
    }
  }

  handleFunctionResult($fn, field, form) {
    // executre validation function
    const res = $fn({ field, form, validator: this.validator });

    /**
      Handle "array"
    */
    if (_isArray(res)) {
      const isValid = res[0] || false;
      const message = res[1] || 'Error';
      return [isValid, message];
    }

    /**
      Handle "boolean"
    */
    if (_isBoolean(res)) {
      return [res, 'Error'];
    }

    /**
      Handle "string"
    */
    if (_isString(res)) {
      return [false, res];
    }

    /**
      Handle "object / promise"
    */
    if (isPromise(res)) {
      return res; // the promise
    }

    /**
      Handle other cases
    */
    return [false, 'Error'];
  }
}
