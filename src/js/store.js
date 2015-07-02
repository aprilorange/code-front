;(function(W, LS) {
  var Store = function(opts) {
  };
  Store.prototype = {
    constructor: Store,
    init: function(opts) {
      this.opts = opts;
      this.defaultDb = opts.db;
      var stored = LS.getItem(opts.db);
      if(!stored) {
        LS.setItem(opts.db, '{}');
      }
    },
    set: function(key, value, cb) {
      var old = LS.getItem(this.defaultDb);
      var obj = JSON.parse(old);
      obj[key] = value;
      var newData = JSON.stringify(obj);
      LS.setItem(this.defaultDb, newData);
      if(cb) {
        return cb(newData);
      } else {
        return newData;
      }
    },
    get: function(key, cb) {
      var old = LS.getItem(this.defaultDb);
      var obj = JSON.parse(old);
      var result = obj ? obj[key] : null;
      if(cb) {
        return cb(result);
      } else {
        return result;
      }
    },
    getAll: function(cb) {
      if(cb) {
        var old = LS.getItem(this.defaultDb);
        var obj = JSON.parse(old);
        return cb(obj);
      } else {
        return obj;
      }
    },
    removeAll: function(cb) {
      LS.removeItem(this.defaultDb);
      if(cb) {
        return cb();
      }
      return true;
    }
  };

  W.Store = Store;
})(window, localStorage);
