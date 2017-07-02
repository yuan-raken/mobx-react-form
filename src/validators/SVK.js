import _find from 'lodash/find';
import _trimStart from 'lodash/trimStart';
import _trim from 'lodash/trim';
import _includes from 'lodash/includes';
import _omitBy from 'lodash/omitBy';
import _isNaN from 'lodash/isNaN';
import _isNull from 'lodash/isNull';
import _isEmpty from 'lodash/isEmpty';
import _isUndefined from 'lodash/isUndefined';
import _isFunction from 'lodash/isFunction';

import { isPromise } from '../utils';

/**
  Schema Validation Keywords

    const plugins = {
      svk: {
        package: ajv,
        extend: callback,
      },
    };

*/
export default class SVK {

  validate = null;

  extend = null;

  promises = [];

  schema = {};

  options;

  constructor(plugin, obj = {}) {
    this.assignInitData(plugin, obj);
    this.initAJV(plugin);
  }

  assignInitData(plugin, { options = {}, schema = {}, promises = [] }) {
    options.set({
      ajv: {
        v5: true,
        allErrors: true,
        coerceTypes: true,
        errorDataPath: 'property',
      },
    });

    this.options = options;
    this.schema = schema;
    this.promises = promises;
    this.extend = plugin.extend;
  }

  initAJV(plugin) {
    if (!this.schema) return;
    // get ajv package
    const AJV = plugin.package || plugin;
    // create ajv instance
    const ajvInstance = new AJV(this.options.get('ajv'));
    // extend ajv using "extend" callback
    if (_isFunction(this.extend)) this.extend(ajvInstance);
    // create ajvInstance validator (compiling rules)
    this.validate = ajvInstance.compile(this.schema);
  }

  validateField(field) {
    const data = { [field.path]: field.value };
    const validate = this.validate(this.parseValues(data));
    // check if is $async schema
    if (isPromise(validate)) {
      const $p = validate
        .then(() => field.setValidationAsyncData(true))
        .catch(err => err && this.handleAsyncError(field, err.errors))
        .then(() => this.executeAsyncValidation(field))
        .then(() => field.showAsyncErrors());

      // push the promise into array
      this.promises.push($p);
      return;
    }
    // check sync errors
    this.handleSyncError(field, this.validate.errors);
  }

  handleSyncError(field, errors) {
    const fieldErrorObj = this.findError(field.key, errors);
    // if fieldErrorObj is not undefined, the current field is invalid.
    if (_isUndefined(fieldErrorObj)) return;
    // the current field is now invalid
    // add additional info to the message
    const msg = `${field.label} ${fieldErrorObj.message}`;
    // invalidate the current field with message
    field.invalidate(msg);
  }

  handleAsyncError(field, errors) {
    // find current field error message from ajv errors
    const fieldErrorObj = this.findError(field.path, errors);
    // if fieldErrorObj is not undefined, the current field is invalid.
    if (_isUndefined(fieldErrorObj)) return;
    // the current field is now invalid
    // add additional info to the message
    const msg = `${field.label} ${fieldErrorObj.message}`;
    // set async validation data on the field
    field.setValidationAsyncData(false, msg);
  }

  findError(path, errors) {
    return _find(errors, ({ dataPath }) => {
      let $dataPath;
      $dataPath = _trimStart(dataPath, '.');
      $dataPath = _trim($dataPath, '[\'');
      $dataPath = _trim($dataPath, '\']');
      return _includes($dataPath, `${path}`);
    });
  }

  executeAsyncValidation(field) {
    if (field.validationAsyncData.valid === false) {
      field.invalidate(field.validationAsyncData.message, true);
    }
  }

  parseValues(values) {
    if (this.options.get('allowRequired') === true) {
      return _omitBy(values, (_isEmpty || _isNull || _isUndefined || _isNaN));
    }
    return values;
  }
}
