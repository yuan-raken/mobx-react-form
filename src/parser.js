import _map from 'lodash/map';
import _each from 'lodash/each';
import _merge from 'lodash/merge';
import _set from 'lodash/set';
import _get from 'lodash/get';
import _has from 'lodash/has';
import _split from 'lodash/split';
import _filter from 'lodash/filter';
import _reduce from 'lodash/reduce';
import _reduceRight from 'lodash/reduceRight';
import _startsWith from 'lodash/startsWith';
import _trimEnd from 'lodash/trimEnd';
import _last from 'lodash/last';
import _endsWith from 'lodash/endsWith';
import _without from 'lodash/without';
import _values from 'lodash/values';
import _replace from 'lodash/replace';
import _parseInt from 'lodash/parseInt';
import _isInteger from 'lodash/isInteger';
import _isArray from 'lodash/isArray';
import _isDate from 'lodash/isDate';
import _isBoolean from 'lodash/isBoolean';
import _isNumber from 'lodash/isNumber';
import _isString from 'lodash/isString';
import _isEmpty from 'lodash/isEmpty';
import _isPlainObject from 'lodash/isPlainObject';

import {
  $try,
  isStruct,
  allowNested,
  pathToStruct,
  hasUnifiedProps,
  isEmptyArray as $isEmptyArray,
  isArrayOfObjects } from './utils';

export const defaultClearValue = ({ value }) => {
  if (_isArray(value)) return [];
  if (_isDate(value)) return null;
  if (_isBoolean(value)) return false;
  if (_isNumber(value)) return 0;
  if (_isString(value)) return '';
  return undefined;
};

export const defaultValue = ({ type, isEmptyArray = false }) => {
  if (type === 'date') return null;
  if (type === 'checkbox') return false;
  if (type === 'number') return 0;
  return isEmptyArray ? [] : '';
};

export const parsePath = (path) => {
  let $path = path;
  $path = _replace($path, new RegExp('\\[', 'g'), '.');
  $path = _replace($path, new RegExp('\\]', 'g'), '');
  return $path;
};

export const parseFieldValue = (parser, { type, isEmptyArray, separated, unified, initial }) =>
  parser($try(separated, unified, initial, defaultValue({ type, isEmptyArray })));

// make integers labels empty
export const parseGetLabel = label =>
  _isInteger(_parseInt(label)) ? '' : label;

export const parseArrayProp = ($val, $prop) => {
  const $values = _values($val);
  if ($prop === 'value' || $prop === 'initial' || $prop === 'default') {
    return _without($values, null, undefined, '');
  }
  return $values;
};

export const parseCheckArray = (field, value, prop) =>
  field.hasIncrementalNestedFields
    ? parseArrayProp(value, prop)
    : value;

export const parseCheckFormatter = ($field, $prop) =>
  ($prop === 'value')
    ? $field.$formatter($field[$prop])
    : $field[$prop];

export const defineFieldsFromStruct = (struct, add = false) =>
  _reduceRight(struct, ($, name) => {
    const obj = {};
    if (_endsWith(name, '[]')) {
      const val = (add) ? [$] : [];
      obj[_trimEnd(name, '[]')] = val;
      return obj;
    }
    // no brakets
    const prev = struct[struct.indexOf(name) - 1];
    const stop = _endsWith(prev, '[]') && (_last(struct) === name);
    if (!add && stop) return obj;
    obj[name] = $;
    return obj;
  }, {});

export const handleFieldsArrayOfStrings = ($fields, add = false) => {
  let fields = $fields;
  // handle array with field struct (strings)
  if (isStruct({ fields })) {
    fields = _reduce(fields, ($obj, $) => {
      const pathStruct = _split($, '.');
      // as array of strings (with empty values)
      if (!pathStruct.length) return Object.assign($obj, { [$]: '' });
      // define flat or nested fields from pathStruct
      return _merge($obj, defineFieldsFromStruct(pathStruct, add));
    }, {});
  }
  return fields;
};

export const handleFieldsArrayOfObjects = ($fields) => {
  let fields = $fields;
  // handle array of objects (with unified props)
  if (isArrayOfObjects(fields)) {
    fields = _reduce(fields, ($obj, $) => {
      if (!_has($, 'name')) return undefined;
      return Object.assign($obj, { [$.name]: $ });
    }, {});
  }
  return fields;
};

export const handleFieldsNested = (fields, strictProps = true) =>
  _reduce(fields, (obj, field, key) => {
    if (allowNested(field, strictProps)) {
      // define nested field
      return Object.assign(obj, {
        [key]: { fields: $isEmptyArray(field) ? [] : handleFieldsNested(field) },
      });
    }
    return Object.assign(obj, { [key]: field });
  }, {});


/* mapNestedValuesToUnifiedValues

FROM:

{
  street: '123 Fake St.',
  zip: '12345',
}

TO:

[{
  name: 'street'
  value: '123 Fake St.',
}, {
  name: 'zip'
  value: '12345',
}]

*/
export const mapNestedValuesToUnifiedValues = data =>
  _isPlainObject(data)
    ? _map(data, (value, name) => ({ value, name }))
    : undefined;

/* reduceValuesToUnifiedFields

FROM:

{
  name: 'fatty',
  address: {
    street: '123 Fake St.',
    zip: '12345',
  },
};

TO:

{
  name: {
    value: 'fatty',
    fields: undefined
  },
  address: {
    value: {
      street: '123 Fake St.',
      zip: '12345'
    },
    fields: [ ... ]
  },
};

*/
export const reduceValuesToUnifiedFields = values =>
  _reduce(values, (obj, value, key) =>
    Object.assign(obj, { [key]: { value,
      fields: mapNestedValuesToUnifiedValues(value),
    } }), {});

/*
  Fallback Unified Props to Sepated Mode
*/
export const handleFieldsPropsFallback = (fields, initial) => {
  if (!_has(initial, 'values')) return fields;
  // if the 'values' object is passed in constructor
  // then update the fields definitions
  let values = initial.values;
  if (hasUnifiedProps({ fields })) {
    values = reduceValuesToUnifiedFields(values);
  }
  return _merge(fields, values);
};

export const mergeSchemaDefaults = (fields, validator) => {
  if (validator) {
    const properties = validator.schema.properties;
    if (_isEmpty(fields) && !!properties) {
      _each(properties, (prop, key) => {
        _set(fields, key, {
          value: prop.default,
          label: prop.title,
        });
      });
    }
  }
  return fields;
};

export const prepareFieldsData = (initial, strictProps = true) => {
  let fields = initial.fields || {};
  fields = handleFieldsArrayOfStrings(fields, false);
  fields = handleFieldsArrayOfObjects(fields);
  fields = handleFieldsPropsFallback(fields, initial);
  fields = handleFieldsNested(fields, strictProps);
  return fields;
};

export const pathToFieldsTree = (struct, path, n = 0, add = false) => {
  const structPath = pathToStruct(path);
  const structArray = _filter(struct, item => _startsWith(item, structPath));
  const $tree = handleFieldsArrayOfStrings(structArray, add);
  const $struct = _replace(structPath, new RegExp('\\[]', 'g'), `[${n}]`);
  return handleFieldsNested(_get($tree, $struct));
};
