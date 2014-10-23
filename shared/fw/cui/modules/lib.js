var exports = {
  extend: Sync.extend,
  each: Sync.each,
  cache: Sync.cache,
  escape: Sync.escape,
  unescape: Sync.unescape,
  events: {
    add: Sync.events.addEvent,
    remove: Sync.events.removeEvent,
    clean: Sync.events.cleanEvents,
    removeAll: Sync.events.removeEventAll,
    dispatch: Sync.events.dispatchEvent
  }
};