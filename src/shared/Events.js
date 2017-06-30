import { observe, intercept } from 'mobx';

import _merge from 'lodash/merge';
import _each from 'lodash/each';

import { parsePath } from '../parser';
import { $try } from '../utils';

/**
  Field Events
*/
export default {

  /**
   MobX Event (observe/intercept)
   */
  MOBXEvent({ path = null, key = 'value', call, type }) {
    const $instance = this.select(path || this.path, null, null) || this;

    const $call = change => call.apply(null, [{
      change,
      form: this.state.form,
      path: $instance.path || null,
      field: $instance.path ? $instance : null,
    }]);

    let fn;
    let ffn;

    if (type === 'observer') {
      fn = observe;
      ffn = $instance.fields.observe;
    }

    if (type === 'interceptor') {
      // eslint-disable-next-line
      key = `$${key}`;
      fn = intercept;
      ffn = $instance.fields.intercept;
    }

    const $dkey = $instance.path
      ? `${key}@${$instance.path}`
      : key;

    _merge(this.state.disposers[type], {
      [$dkey]: (key === 'fields')
        ? ffn.apply(change => $call(change))
        : fn($instance, key, change => $call(change)),
    });
  },

  /**
   Dispose MOBX Events
   */
  dispose(opt = null) {
    if (this.path && opt) return this.disposeSingle(opt);
    return this.disposeAll(opt);
  },

  /**
   Dispose All Events (observe/intercept)
   */
  disposeAll() {
    const dispose = disposer => disposer.apply();
    _each(this.state.disposers.interceptor, dispose);
    _each(this.state.disposers.observer, dispose);
    this.state.disposers = { interceptor: {}, observer: {} };
    return null;
  },

  /**
   Dispose Single Event (observe/intercept)
   */
  disposeSingle({ type, key = 'value', path = null }) {
    const $path = parsePath($try(path, this.path));
    // eslint-disable-next-line
    if (type === 'interceptor') key = `$${key}`; // target observables
    this.state.disposers[type][`${key}@${$path}`].apply();
    delete this.state.disposers[type][`${key}@${$path}`];
  },

};

