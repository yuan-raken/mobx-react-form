import { action } from 'mobx';

import _get from 'lodash/get';
import _each from 'lodash/each';
import _isNil from 'lodash/isNil';
import _trimStart from 'lodash/trimStart';

import {
  pathToStruct } from '../utils';

import {
  prepareFieldsData,
  mergeSchemaDefaults } from '../parser';

/**
  Field Initializer
*/
export default {

  initFields(initial, update) {
    const $path = key => _trimStart([this.path, key].join('.'), '.');

    let fields;
    fields = prepareFieldsData(initial, this.state.strict);
    fields = mergeSchemaDefaults(fields, this.validator);

    // create fields
    _each(fields, (field, key) =>
      _isNil(this.select($path(key), null, false)) &&
        this.initField(key, $path(key), field, update));
  },

  @action
  initField(key, path, data, update = false) {
    const initial = this.state.get('current', 'props');
    const struct = pathToStruct(path);
    // try to get props from separated objects
    const $try = prop => _get(initial[prop], struct);

    const props = {
      $value: $try('values'),
      $label: $try('labels'),
      $placeholder: $try('placeholders'),
      $default: $try('defaults'),
      $initial: $try('initials'),
      $disabled: $try('disabled'),
      $bindings: $try('bindings'),
      $type: $try('types'),
      $options: $try('options'),
      $extra: $try('extra'),
      $related: $try('related'),
      $validators: $try('validators'),
      $rules: $try('rules'),
      $observers: $try('observers'),
      $interceptors: $try('interceptors'),
      $onDrop: $try('onDrop'),
      $onSubmit: $try('onSubmit'),
      $onReset: $try('onReset'),
      $onClear: $try('onClear'),
      $parse: $try('parse'),
      $format: $try('format'),
    };

    const field = this.state.form.makeField({
      key, path, data, props, update, state: this.state,
    });

    this.fields.merge({ [key]: field });

    return field;
  },

};
