import _has from 'lodash/has';
import _each from 'lodash/each';
import _merge from 'lodash/merge';
import _isFunction from 'lodash/isFunction';
import _isPlainObject from 'lodash/isPlainObject';

import { $try } from './utils';

export default class Bindings {

  templates = {
    // default: ({ field, props, keys, $try }) => ({
    //   [keys.id]: $try(props.id, field.id),
    // }),
  };

  rewriters = {
    default: {
      id: 'id',
      name: 'name',
      type: 'type',
      value: 'value',
      checked: 'checked',
      label: 'label',
      placeholder: 'placeholder',
      disabled: 'disabled',
      onChange: 'onChange',
      onBlur: 'onBlur',
      onFocus: 'onFocus',
      autoFocus: 'autoFocus',
    },
  };

  load(field, name = 'default', props) {
    if (_has(this.rewriters, name)) {
      const $bindings = {};

      _each(this.rewriters[name], ($v, $k) =>
        _merge($bindings, { [$v]: $try(props[$k], field[$k]) }));

      return $bindings;
    }

    return this.templates[name]({
      keys: this.rewriters[name],
      $try,
      field,
      props,
    });
  }

  register(bindings) {
    _each(bindings, (val, key) => {
      if (_isFunction(val)) _merge(this.templates, { [key]: val });
      if (_isPlainObject(val)) _merge(this.rewriters, { [key]: val });
    });

    return this;
  }
}
