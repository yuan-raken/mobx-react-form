import _split from 'lodash/split';
import _head from 'lodash/head';
import _each from 'lodash/each';
import _trim from 'lodash/trim';
import _isNil from 'lodash/isNil';

import { parsePath } from '../parser';
import { $try, throwError } from '../utils';

/**
  Field Utils
*/
export default {

  /**
   Fields Selector
   */
  select(path, fields = null, isStrict = true) {
    const $path = parsePath(path);
    const $keys = _split($path, '.');
    const $head = _head($keys);

    $keys.shift();

    let $fields = _isNil(fields)
      ? this.fields.get($head)
      : fields.get($head);

    let stop = false;
    _each($keys, ($key) => {
      if (stop) return;
      if (_isNil($fields)) {
        $fields = undefined;
        stop = true;
      } else {
        $fields = $fields.fields.get($key);
      }
    });

    if (isStrict) throwError(path, $fields);

    return $fields;
  },

  /**
    Get Container
   */
  container(path) {
    const $path = parsePath($try(path, this.path));
    const cpath = _trim($path.replace(new RegExp('[^./]+$'), ''), '.');

    if (!!this.path && _isNil(path)) {
      return this.state.form.select(cpath, null, false);
    }

    return this.select(cpath, null, false);
  },

  /**
    Has Field
   */
  has(path) {
    return this.fields.has(path);
  },

  /**
   Map Fields
  */
  map(cb) {
    return this.fields.values().map(cb);
  },

  /**
   * Iterates deeply over fields and invokes `iteratee` for each element.
   * The iteratee is invoked with three arguments: (value, index|key, depth).
   *
   * @param {Function} iteratee The function invoked per iteration.
   * @param {Array|Object} [fields=form.fields] fields to iterate over.
   * @param {number} [depth=1] The recursion depth for internal use.
   * @returns {Array} Returns [fields.values()] of input [fields] parameter.
   * @example
   *
   * JSON.stringify(form)
   * // => {
     *   "fields": {
     *     "state": {
     *       "fields": {
     *         "city": {
     *           "fields": { "places": {
     *                "fields": {},
     *                "key": "places", "path": "state.city.places", "$value": "NY Places"
     *              }
     *           },
     *           "key": "city", "path": "state.city", "$value": "New York"
     *         }
     *       },
     *       "key": "state", "path": "state", "$value": "USA"
     *     }
     *   }
     * }
   *
   * const data = {};
   * form.each(field => data[field.path] = field.value);
   * // => {
     *   "state": "USA",
     *   "state.city": "New York",
     *   "state.city.places": "NY Places"
     * }
   *
   */
  each(iteratee, fields = null, depth = 0) {
    const $fields = fields || this.fields;
    _each($fields.values(), (field, index) => {
      iteratee(field, index, depth);

      if (field.fields.size !== 0) {
        this.each(iteratee, field.fields, depth + 1);
      }
    });
  },

};

