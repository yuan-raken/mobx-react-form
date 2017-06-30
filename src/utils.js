import _map from 'lodash/map';
import _has from 'lodash/has';
import _max from 'lodash/max';
import _some from 'lodash/some';
import _every from 'lodash/every';
import _keys from 'lodash/keys';
import _ary from 'lodash/ary';
import _trim from 'lodash/trim';
import _union from 'lodash/union';
import _partial from 'lodash/partial';
import _intersection from 'lodash/intersection';
import _uniqueId from 'lodash/uniqueId';
import _values from 'lodash/values';
import _replace from 'lodash/replace';
import _isNil from 'lodash/isNil';
import _isInteger from 'lodash/isInteger';
import _isArray from 'lodash/isArray';
import _isDate from 'lodash/isDate';
import _isBoolean from 'lodash/isBoolean';
import _isString from 'lodash/isString';
import _isEmpty from 'lodash/isEmpty';
import _isUndefined from 'lodash/isUndefined';
import _isObject from 'lodash/isObject';
import _isPlainObject from 'lodash/isPlainObject';


export const props = {
  booleans: ['hasError', 'isValid', 'isDirty', 'isPristine', 'isDefault', 'isEmpty', 'focused', 'touched', 'changed', 'disabled'],
  field: ['value', 'initial', 'default', 'label', 'placeholder', 'disabled', 'related', 'options', 'extra', 'bindings', 'type', 'error'],
  separated: ['values', 'initials', 'defaults', 'labels', 'placeholders', 'disabled', 'related', 'options', 'extra', 'bindings', 'types'],
  function: ['observers', 'interceptors', 'parse', 'format'],
  hooks: ['onDrop', 'onSubmit', 'onReset', 'onClear'],
  validation: ['rules', 'validators'],
  types: {
    isDirty: 'some',
    isValid: 'every',
    isPristine: 'every',
    isDefault: 'every',
    isEmpty: 'every',
    hasError: 'some',
    focused: 'some',
    touched: 'some',
    changed: 'some',
    disabled: 'every',
  },
};

export const checkObserveItem = change => ({ key, to, type, exec }) =>
  (change.type === type && change.name === key && change.newValue === to)
    && exec.apply(change, [change]);

export const checkObserve = collection => change =>
  collection.map(checkObserveItem(change));

export const checkPropType = ({ type, data }) => {
  let $check;
  switch (type) {
    case 'some': $check = $data => _some($data, Boolean); break;
    case 'every': $check = $data => _every($data, Boolean); break;
    default: $check = null;
  }
  return $check(data);
};

export const hasProps = ($type, $data) => {
  let $props;
  switch ($type) {
    case 'booleans':
      $props = props.booleans;
      break;
    case 'field': $props = [
      ...props.field,
      ...props.validation,
      ...props.function,
      ...props.hooks,
    ]; break;
    case 'all': $props = ['id',
      ...props.booleans,
      ...props.field,
      ...props.validation,
      ...props.function,
      ...props.hooks,
    ]; break;
    default: $props = null;
  }
  return _intersection($data, $props).length > 0;
};

/**
  Check Allowed Properties
*/
export const allowedProps = (type, data) => {
  if (hasProps(type, data)) return;
  const $msg = 'The selected property is not allowed';
  throw new Error(`${$msg} (${JSON.stringify(data)})`);
};

/**
  Throw Error if undefined Fields
*/
export const throwError = (path, fields, msg = null) => {
  if (!_isNil(fields)) return;
  const $msg = _isNil(msg) ? 'The selected field is not defined' : msg;
  throw new Error(`${$msg} (${path})`);
};

export const pathToStruct = (path) => {
  let struct;
  struct = _replace(path, new RegExp('[.]\\d+($|.)', 'g'), '[].');
  struct = _replace(struct, '..', '.');
  struct = _trim(struct, '.');
  return struct;
};

export const hasSome = (obj, keys) =>
  _some(keys, _partial(_has, obj));

export const isPromise = obj => (!!obj && typeof obj.then === 'function'
  && (typeof obj === 'object' || typeof obj === 'function'));

export const isStruct = ({ fields }) => (
  _isArray(fields) &&
  _every(fields, _isString)
);

export const isEmptyArray = field =>
  (_isEmpty(field) && _isArray(field));

export const isArrayOfObjects = fields =>
  _isArray(fields) && _every(fields, _isPlainObject);

export const $getKeys = fields =>
_union(_map(_values(fields), values => _keys(values))[0]);

export const hasUnifiedProps = ({ fields }) =>
  !isStruct({ fields }) && hasProps('field', $getKeys(fields));

export const hasSeparatedProps = initial => (
  hasSome(initial, props.separated) ||
  hasSome(initial, props.validation)
);

export const allowNested = (field, strictProps) =>
  _isObject(field) && !_isDate(field) && !_has(field, 'fields')
    && (!hasSome(field, props.field) || strictProps);

export const parseIntKeys = fields =>
 _map(fields.keys(), _ary(parseInt, 1));

export const hasIntKeys = fields =>
  _every(parseIntKeys(fields), _isInteger);

export const maxKey = (fields) => {
  const max = _max(parseIntKeys(fields));
  return _isUndefined(max) ? 0 : max + 1;
};

export const makeId = path =>
  _uniqueId([_replace(path, new RegExp('\\.', 'g'), '-'), '--'].join(''));

export const $isEvent = (obj) => {
  if (_isNil(obj) || typeof Event === 'undefined') return false;
  return (obj instanceof Event || !_isNil(obj.target)); // eslint-disable-line
};

export const $hasFiles = $ =>
  ($.target.files && $.target.files.length !== 0);

export const $isBool = ($, val) =>
  _isBoolean(val) &&
  _isBoolean($.target.checked);

export const $try = (...args) => {
  let found = null;

  args.map(val =>
    ((found === null) && !_isNil(val))
      && (found = val));

  return found;
};
