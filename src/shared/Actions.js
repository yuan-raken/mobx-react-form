import { action } from 'mobx';

import _each from 'lodash/each';
import _has from 'lodash/has';
import _set from 'lodash/set';
import _merge from 'lodash/merge';
import _last from 'lodash/last';
import _split from 'lodash/split';
import _trim from 'lodash/trim';
import _trimEnd from 'lodash/trimEnd';
import _trimStart from 'lodash/trimStart';
import _reduce from 'lodash/reduce';
import _isNil from 'lodash/isNil';
import _isArray from 'lodash/isArray';
import _isString from 'lodash/isString';
import _isUndefined from 'lodash/isUndefined';
import _isPlainObject from 'lodash/isPlainObject';
import _isObject from 'lodash/isObject';

import {
  parsePath,
  prepareFieldsData,
  pathToFieldsTree,
  parseCheckFormatter,
  parseCheckArray } from '../parser';

import {
  $try,
  props,
  isPromise,
  allowedProps,
  checkPropType,
  hasUnifiedProps,
  throwError,
  maxKey } from '../utils';

/**
  Field Actions
*/
export default {

  validate(opt = {}, obj = {}) {
    const $opt = _merge(opt, { path: this.path });
    return this.state.form.validator.validate($opt, obj);
  },

  /**
    Submit
  */
  @action
  submit(o = {}) {
    this.$submitting = true;
    const noop = () => {};
    const onSuccess = o.onSuccess || this.onSuccess || this.$onSubmit.onSuccess || noop;
    const onError = o.onError || this.onError || this.$onSubmit.onError || noop;

    const exec = isValid => isValid
      ? onSuccess.apply(this, [this])
      : onError.apply(this, [this]);

    const validate = () =>
      this.validate({
        showErrors: this.state.options.get('showErrorsOnSubmit', this),
      })
        .then(({ isValid }) => {
          const handler = exec(isValid);
          if (isValid) return handler;
          const $err = this.state.options.get('defaultGenericError', this);
          const $throw = this.state.options.get('submitThrowsError', this);
          if ($throw && $err) this.invalidate();
          return handler;
        })
        .then(action(() => (this.$submitting = false)))
        .catch(action((err) => {
          this.$submitting = false;
          throw err;
        }))
        .then(() => this);


    return isPromise(exec)
      ? exec.then(() => validate())
      : validate();
  },

  /**
   Check Field Computed Values
   */
  check(prop, deep = false) {
    allowedProps('booleans', [prop]);

    return deep
      ? checkPropType({
        type: props.types[prop],
        data: this.deepCheck(props.types[prop], prop, this.fields),
      })
      : this[prop];
  },

  deepCheck(type, prop, fields) {
    return _reduce(fields.values(), (check, field) => {
      if (field.fields.size === 0) {
        check.push(field[prop]);
        return check;
      }
      const $deep = this.deepCheck(type, prop, field.fields);
      check.push(checkPropType({ type, data: $deep }));
      return check;
    }, []);
  },

  /**
   Update Field Values recurisvely
   OR Create Field if 'undefined'
   */
  update(fields) {
    const $fields = prepareFieldsData({ fields }, this.state.strict);
    this.deepUpdate($fields);
  },

  @action
  deepUpdate(fields, path = '', recursion = true) {
    _each(fields, (field, key) => {
      const $path = _trimStart(`${path}.${key}`, '.');
      const $field = this.select($path, null, false);
      const $container = this.select(path, null, false)
        || this.state.form.select(this.path, null, false);

      if (!_isNil($field) && !_isNil(field)) {
        if (_isArray($field.values())) {
          _each($field.fields.values(), $f =>
            $field.fields.delete($f.name));
        }
        if (_isNil(field.fields)) {
          $field.value = field;
          return;
        }
      }

      if (!_isNil($container)) {
        // get full path when using update() with select() - FIX: #179
        const $newFieldPath = _trimStart([this.path, $path].join('.'), '.');
        // init field into the container field
        $container.initField(key, $newFieldPath, field, true);
      }

      if (recursion) {
        // handle nested fields if undefined or null
        const $fields = pathToFieldsTree(this.state.struct(), $path);
        this.deepUpdate($fields, $path, false);
      }

      if (recursion && _has(field, 'fields') && !_isNil(field.fields)) {
        // handle nested fields if defined
        this.deepUpdate(field.fields, $path);
      }
    });
  },

  /**
    Get Fields Props
   */
  get(prop = null, strict = true) {
    if (_isNil(prop)) {
      return this.deepGet([
        ...props.booleans,
        ...props.field,
        ...props.validation,
      ], this.fields);
    }

    allowedProps('all', _isArray(prop) ? prop : [prop]);

    if (_isString(prop)) {
      if (strict && this.fields.size === 0) {
        return parseCheckFormatter(this, prop);
      }

      const value = this.deepGet(prop, this.fields);
      return parseCheckArray(this, value, prop);
    }

    return this.deepGet(prop, this.fields);
  },

  /**
    Get Fields Props Recursively
   */
  deepGet(prop, fields) {
    return _reduce(fields.values(), (obj, field) => {
      const $nested = $fields => ($fields.size !== 0)
        ? this.deepGet(prop, $fields)
        : undefined;

      Object.assign(obj, {
        [field.key]: { fields: $nested(field.fields) },
      });

      if (_isString(prop)) {
        const removeValue = (prop === 'value') &&
          ((this.state.options.get('retrieveOnlyDirtyValues', this) && field.isPristine) ||
          (this.state.options.get('retrieveOnlyEnabledFields', this) && field.disabled));

        if (field.fields.size === 0) {
          delete obj[field.key]; // eslint-disable-line
          if (removeValue) return obj;
          return Object.assign(obj, {
            [field.key]: parseCheckFormatter(field, prop),
          });
        }

        let value = this.deepGet(prop, field.fields);
        if (prop === 'value') value = field.$formatter(value);


        delete obj[field.key]; // eslint-disable-line
        if (removeValue) return obj;

        const data = hasUnifiedProps({
          fields: [value],
        }) ? value[prop] : value;

        return Object.assign(obj, {
          [field.key]: parseCheckArray(field, data, prop),
        });
      }

      _each(prop, $prop =>
        Object.assign(obj[field.key], {
          [$prop]: field[$prop],
        }));

      return obj;
    }, {});
  },

  /**
   Set Fields Props
   */
  @action
  set(prop, data) {
    // UPDATE CUSTOM PROP
    if (_isString(prop) && !_isUndefined(data)) {
      allowedProps('field', [prop]);
      const deep = (_isObject(data) && prop === 'value') || _isPlainObject(data);
      if (deep && this.hasNestedFields) this.deepSet(prop, data, '', true);
      else _set(this, `$${prop}`, data);
      return;
    }

    // NO PROP NAME PROVIDED ("prop" is value)
    if (_isNil(data)) {
      if (this.hasNestedFields) this.deepSet('value', prop, '', true);
      else this.set('value', prop);
    }
  },

  /**
    Set Fields Props Recursively
   */
  deepSet($, data, path = '', recursion = false) {
    const err = 'You are updating a not existent field:';
    const isStrict = this.state.options.get('strictUpdate', this);

    _each(data, ($val, $key) => {
      const $path = _trimStart(`${path}.${$key}`, '.');
      // get the field by path joining keys recursively
      const field = this.select($path, null, isStrict);
      // if no field found when is strict update, throw error
      if (isStrict) throwError($path, field, err);
      // update the field/fields if defined
      if (!_isUndefined(field)) {
        // update field values or others props
        field.set($, $val, recursion);
        // update values recursively only if field has nested
        if (field.fields.size && _isObject($val)) {
          this.deepSet($, $val, $path, recursion);
        }
      }
    });
  },

  /**
   Add Field
   */
  @action
  add(value = null, opt = {}) {
    let $key;

    if (_has(opt, 'key')) $key = opt.key;
    else $key = maxKey(this.fields);

    const tree = pathToFieldsTree(this.state.struct(), this.path, 0, true);
    const $path = key => _trimStart([this.path, key].join('.'), '.');

    _each(tree, field => this.initField($key, $path($key), field));

    if (!_isNil(value)) {
      const field = this.select($key, null, false)
        || this.initField($key, $path($key));

      if (_isPlainObject(value)) {
        field.update(value);
      }

      field.set('initial', value);
      field.set('default', value);
      field.set('value', value);
    }

    return $key;
  },

  /**
   Del Field
   */
  @action
  del(partialPath = null) {
    const path = parsePath($try(partialPath, this.path));
    const keys = _split(path, '.');
    const last = _last(keys);
    const cpath = _trimEnd(path, `.${last}`);
    const isStrict = this.state.options.get('strictDelete', this);

    const container = this.select(cpath, null, false)
      || this.state.form.select(cpath, null, false)
      || this.state.form.select(this.path, null, true);

    if (isStrict && !container.fields.has(last)) {
      const msg = `Key "${last}" not found when trying to delete field`;
      const $path = _trim([this.path, path].join('.'), '.');
      throwError($path, null, msg);
    }

    container.fields.delete(last);
  },

};
