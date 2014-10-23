(function() {
  var reloadButton = document.getElementById('reload'),
    attachButton = document.getElementById('attach'),
    clearButton = document.getElementById('clear'),
    toggleAttach = document.getElementById('toggle-attach'),
    settingsButton = document.getElementById('settings-button');

  var isChrome = typeof chrome !== 'undefined';

  reloadButton.addEventListener('click', function() {
    sendServiceAction('reload_and_attach');
    toggleAttach.setAttribute('selected', '');
  });

  attachButton.addEventListener('click', function() {
    doAttach();
  });

  clearButton.addEventListener('click', function() {
    doClear();
  });

  toggleAttach.addEventListener('click', function() {
    var selected = this.hasAttribute('selected');

    if (!selected) {
      doAttach();
    } else {
      doDetach();
    }
  });

  settingsButton.addEventListener('click', function() {
    var settings = document.getElementById('settings');

    settings.hidden = false;
    settings.querySelector('.close').onclick = function() {
      this.onclick = null;
      settings.hidden = true;
    };
  });

  var doAttach = function() {
    sendServiceAction('attach');
    toggleAttach.setAttribute('selected', '');
  },
  doDetach = function() {
    sendServiceAction('detach');
    toggleAttach.removeAttribute('selected');
  };

  var createPromiseRow = function() {
    var item = document.createElement('div'),
      cont = document.createElement('div'),
      name = document.createElement('div'),
      status = document.createElement('div'),
      value = document.createElement('div'),
      id = document.createElement('div'),
      extend = document.createElement('div'),
      chain = document.createElement('div');

    item.className = 'pd-table-row';
    cont.className = 'pd-table-row-cont';

    name.className = 'pd-table-cell';
    id.className = 'pd-table-cell';
    status.className = 'pd-table-cell';
    value.className = 'pd-table-cell';
    chain.className = 'pd-table-cell';

    extend.className = 'pd-table-extend';

    id.classList.add('cell-id');

    item.appendChild(cont);
    item.appendChild(extend);

    cont.appendChild(id);
    cont.appendChild(name);
    cont.appendChild(status);
    cont.appendChild(value);
    cont.appendChild(chain);

    return {
      chain: chain,
      extend: extend,
      cont: cont,
      item: item,
      name: name,
      status: status,
      value: value,
      id: id
    };
  },
  toggleExtendBlock = function(extend, block) {
    var currentBlock = extend.currentBlock;

    if (currentBlock) {
      extend.removeChild(currentBlock);
    }

    if (currentBlock !== block) {
      extend.appendChild(block);
      extend.currentBlock = block;
    } else {
      extend.currentBlock = null;
    }
  },
  checkTbody = function(tbody) {
    if (tbody.childElementCount) {
      tbody.hidden = false;
    } else {
      tbody.hidden = true;
    }
  },
  extractUrl = function(input) {
    var R_URL = /((?:\w+?\:\/\/)[\s\S]*?):(\d+):(\d+)/g;
    var R_FX_ANONYMOUR_URL = /((?:\w+?\:\/\/)[\s\S]*?) line (\d+) > (?:[\s\S]*)/g;

    var urlMatch,
      usedReg;

    while (urlMatch = R_FX_ANONYMOUR_URL.exec(input)) {
      usedReg = R_FX_ANONYMOUR_URL;
      break;
    }

    if (!urlMatch) {
      while (urlMatch = R_URL.exec(input)) {
        usedReg = R_URL;
        break;
      }
    }

    if (urlMatch) {
      return {
        match: urlMatch,
        usedReg: usedReg
      };
    } else {
      return null;
    }
  },
  parseAndGerRerouceLink = function(input, url) {
    if (!url) {
      url = extractUrl(input);
    }

    var urlMatch = url && url.match,
      usedReg = url && url.usedReg;

    if (urlMatch) {
      var a = document.createElement('a'),
        url = urlMatch[0],
        prefix = input.slice(0, usedReg.lastIndex - url.length),
        postfix = input.slice(usedReg.lastIndex);

      a.className = 'resource-link';
      a.textContent = url;
      a.href = url;
      a.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        sendServiceAction('open_resource', {
          file: urlMatch[1],
          line: urlMatch[2],
          col: urlMatch[3]
        });
      });
    }

    var span = document.createElement('span');

    if (urlMatch) {
      span.appendChild(document.createTextNode(prefix));
      span.appendChild(a);
      span.appendChild(document.createTextNode(postfix));
    } else {
      span.textContent = input;
    }

    return span;
  },
  getNameFromStackOld = function(stack, i) {
    var lines = stack.split(/(?:\n+|\->)/),
      name,
      url;

    while (
      (name = lines[i]) && (name.indexOf('(native)') !== -1 ||
      name.indexOf('(<anonymous>:') !== -1) &&
      i < lines.length
    ) {
      ++i;
    }

    var resourceLink = parseAndGerRerouceLink(name);

    return resourceLink;
  },
  getNameFromStack = function(handledStack, i, name) {
    var stackName = handledStack.lines[0],
      url = extractUrl(stackName),
      urlMatch = url && url.match;

    if (name) {
      stackName += ' with ' + name;
    }
      
    var resourceLink = parseAndGerRerouceLink(stackName);

    return resourceLink;
  },
  handleStack = function(stack) {
    return handleEverStack(stack);

    if (isChrome) {
      return handleChromeStack(stack);
    } else {
      return handleFxStack(stack);
    }
  },
  handleEverStack = function(stack) {
    var lines = stack.split(/(?:\n+|\->)/),
      line,
      i = 0,
      newLines = [],
      firstLine = lines[0],
      message;

    if (isChrome && firstLine &&
      firstLine.search(/\bat\b/) === -1 && firstLine.search(/error/i) !== -1) {
      message = firstLine;
      lines = lines.slice(1);
    }

    if (!PromisesPanel.settings.show_full_stack) {
      while (i < lines.length) {
        line = lines[i];
        ++i;

        if (
          line && (
            line.indexOf('(native)') !== -1 ||
            line.indexOf('(<anonymous>:') !== -1 ||
            line.indexOf('resource://') !== -1 ||
            line.indexOf('jar:file://') !== -1
          )
        ) {
          continue;
        }

        if (line) {
          newLines.push(line);
        }
      }
    } else {
      newLines = lines;
    }

    if (!newLines.length) {
      return null;
    }

    return {
      lines: newLines,
      message: message
    };
  },
  prepend = function(container, child) {
    if (container.firstChild) {
      container.insertBefore(child, container.firstChild);
    } else {
      container.appendChild(child);
    }
  },
  doClear = function(force) {
    if (!force) {
      // stack not used promises for future use
      Object.keys(promises).forEach(function(key) {
        var promiseRecord = promisesStash[key] = promises[key];

        promiseRecord.row = null;
      });
    } else {
      promisesStash = {};
    }

    promises = {};

    [].slice.call(table.querySelectorAll('.pd-table-body')).forEach(function(tbody) {
      tbody.innerHTML = '';
    });
  },
  getTopLevelParent = function(promiseRecord) {
    while (promiseRecord.parent) {
      promiseRecord = promiseRecord.parent;
    }

    return promiseRecord;
  },
  sendServiceAction = function(action, message) {
    window.postMessage({
      serviceAction: action,
      message: message
    }, '*');
  };

  var table = document.getElementById('promises-table'),
    tBodies = table.querySelectorAll('.pd-table-body'),
    tbodyErrors = table.querySelector('.tbody-errors'),
    tbodyChainErrors = table.querySelector('.tbody-chain-errors'),
    tbodyPending = table.querySelector('.tbody-pending'),
    tbodySuccess = table.querySelector('.tbody-success');

  var promises = {},
    promisesStash = {};

  var actions = {
    show_need_reload: function() {
      var needReload = document.getElementById('need-reload'),
        content = document.getElementById('content');

      toggleAttach.removeAttribute('selected');

      needReload.hidden = false;
      content.hidden = true;
    },
    show_not_attached: function() {
      toggleAttach.removeAttribute('selected');
    },
    show_main: function() {
      var needReload = document.getElementById('need-reload'),
        content = document.getElementById('content');

      needReload.hidden = true;
      content.hidden = false;
    },
    update_data: function(message) {
      var event = message.event;

      if (dataUpdates.hasOwnProperty(event)) {
        dataUpdates[event](message);
      }
    },
    reload: function() {
      doClear(true);
    }
  },
  dataUpdates = {
    create: function(message) {
      var data = message.data;

      var topLevel = !!data.topLevel;

      var handledStack = data.handledStack = handleStack(data.stack);

      if (!handledStack) {
        // this is due this bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1085124
        // in short firefox calls Promise.then from native code with native 
        // functions in the end promises chain (for debug?)
        return;
      }

      var row = createPromiseRow(),
        name = getNameFromStack(data.handledStack, 2, data.name),
        stackCont = document.createElement('div'),
        chainCont = document.createElement('div');

      var promiseRecord = promises[data.id] = {
        id: data.id,
        row: row,
        data: data,
        topLevel: topLevel,
        chaining: [],
        _chaingLength: 0,
        get chaingLength() {
          return this._chaingLength;
        },
        set chaingLength(val) {
          var parentRecord = this.parent;

          this._chaingLength = val;

          if (parentRecord && parentRecord.chaingLength < val + 1) {
            parentRecord.chaingLength = val + 1;
            parentRecord.mostChaing = this;
          }

          this.row.chain.textContent = val;
        },
        _mostChaing: null,
        set mostChaing(val) {
          this._mostChaing = val;
        },
        get mostChaing() {
          return this._mostChaing || this.chaining[0] || null;
        }
      };

      if (!topLevel) {
        var parentRecord = promiseRecord.parent = promises[data.parentPromise];

        if (parentRecord) {
          parentRecord.chaining.push(promiseRecord);

          if (!parentRecord.chaingLength) {
            parentRecord.chaingLength = 1;
          }
        }
      }

      // chainCont.hidden = true;
      // row.extend.appendChild(chainCont)

      row.chain.style.cursor = 'pointer';
      row.chain.addEventListener('click', function(e) {
        if (!promiseRecord.chaingLength) return;

        e.preventDefault();
        e.stopPropagation();

        var chainRecursion = function(record, index) {
          var arr = [
            '<div style="margin-left: ' + index * 10 + 'px;" class="pd-promise-chain">'
          ];

          record.chaining.forEach(function(promiseRecord) {
            arr.push('<div>')
              arr.push('<div class="pd-promise-chain-item">Promise[' + promiseRecord.id + '], Chain[' + promiseRecord.chaingLength + '], ' + (promiseRecord.state ? 'State[' + promiseRecord.state + ']' : '') + '</div>');
              arr.push(chainRecursion(promiseRecord, index + 1));
            arr.push('</div>');
          });

          arr.push('</div>');

          return arr.join('');
        };

        // var chain = chainRecursion(promiseRecord, 0);

        chainCont.innerHTML = '';

        // if (chainCont.hidden) {
          // chainCont.innerHTML = '<div class="ui segment">' + chain + '</div>';

          var wrap = document.createElement('div');

          wrap.className = 'ui segment';
          // wrap.textContent = 'test';

          var useRecord = promiseRecord;

          while (useRecord = useRecord.mostChaing) {
            wrap.appendChild(useRecord.row.item);
          }

          chainCont.appendChild(wrap);
        // }

        // chainCont.hidden = !chainCont.hidden;
        toggleExtendBlock(row.extend, chainCont);
      });

      // stackCont.hidden = true;
      stackCont.innerHTML = '<div class="ui message" style="overflow: auto;"></div>';
      (function(cont) {
        // var stack = data.stack.split(/\n/).slice(1),
        var fragment = document.createDocumentFragment();

        handledStack.lines.forEach(function(line) {
          var resource = parseAndGerRerouceLink(line),
            div = document.createElement('div');

          div.appendChild(resource);

          fragment.appendChild(div);
        });

        cont.appendChild(fragment);
      }(stackCont.firstChild));

      // row.extend.appendChild(stackCont);

      row.name.style.cursor = 'pointer';
      row.name.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        toggleExtendBlock(row.extend, stackCont);
        // stackCont.hidden = !stackCont.hidden;
      });

      row.id.textContent = data.id;
      row.name.appendChild(name);
      row.status.textContent = 'pending';
      row.value.textContent = 'none'
      // row.chain.textContent = promiseRecord.chaingLength;

      // if (topLevel) {
        prepend(tbodyPending, row.item);
        checkTbody(tbodyPending);
      // }
    },
    value: function(message) {
      var data = message.data;

      var promise = promises[data.id];

      if (!promise || !promise.row) return;

      if (data.state === 'error') {
        promise.row.cont.classList.add('negative');
        promise.row.status.textContent = 'rejected';

        if (promise.topLevel) {
          prepend(tbodyErrors, promise.row.item);
          checkTbody(tbodyErrors);
        } else {
          var topLevelParent = getTopLevelParent(promise);

          if (topLevelParent.state !== 'error') {
            topLevelParent.row.cont.classList.remove('positive');
            topLevelParent.row.cont.classList.add('warning');
            prepend(tbodyChainErrors, topLevelParent.row.item);
            checkTbody(tbodyChainErrors);
          }
        }
      } else {
        promise.row.cont.classList.add('positive');
        promise.row.status.textContent = 'fullfiled';

        if (promise.topLevel) {
          prepend(tbodySuccess, promise.row.item);
          checkTbody(tbodySuccess);
        }
      }

      if (!promise.topLevel) {
        try {
          tbodyPending.removeChild(promise.row.item);
          checkTbody(tbodyPending);
        } catch (e) {}
      }

      promise.value = data.value;
      promise.state = data.state;

      var textVal,
        htmlVal;

      switch (data.value.type) {
        case 'primitive': {
          textVal = data.value.primitive + ': ' + data.value.value;

          var div = document.createElement('div');

          div.className = 'primitive-value';
          div.textContent = textVal;

          promise.row.value.innerHTML = '';
          promise.row.value.appendChild(div);
        }; break;
        case 'keys': {
          var keys = data.value.allKeys;

          textVal = 'Object: { ' + keys.join(', ') + ' }';

          var div = document.createElement('div');

          div.className = 'keys-value';
          div.textContent = textVal;

          promise.row.value.innerHTML = '';
          promise.row.value.appendChild(div);
        }; break;
        case 'object': {
          textVal = data.value.object;
          promise.row.value.textContent = textVal;
        }; break;
        case 'error': (function() {
          var handledStack = handleStack(data.value.error.stack),
            errMessage = (handledStack.message || data.value.error.message || 'Error:');

          var val = '<i class="attention icon"></i> ' + errMessage + ' ',
            wrap = document.createElement('div'),
            errorCont = document.createElement('div');

          wrap.role = 'button';
          wrap.className = 'pd-show-error';
          wrap.innerHTML = val;

          wrap.appendChild(getNameFromStack(handledStack, 1));

          wrap.style.cursor = 'pointer';
          wrap.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // errorCont.hidden = !errorCont.hidden;
            toggleExtendBlock(promise.row.extend, errorCont);
          });

          // errorCont.hidden = true;
          errorCont.innerHTML = '<div class="ui error message" style="overflow: auto;"></div>';

          (function(cont) {
            var fragment = document.createDocumentFragment();

            var firstDiv = document.createElement('div');

            firstDiv.textContent = errMessage;
            fragment.appendChild(firstDiv);

            handledStack.lines.forEach(function(line) {
              var resource = parseAndGerRerouceLink(line),
                div = document.createElement('div');

              div.style.marginLeft = '20px';
              div.appendChild(resource);

              fragment.appendChild(div);
            });

            cont.appendChild(fragment);
          }(errorCont.firstChild));

          // promise.row.extend.appendChild(errorCont);

          promise.row.value.innerHTML = '';
          promise.row.value.appendChild(wrap);

          promise.row.value.classList.add('error');
        }()); break;
        case 'function': {
          textVal = data.value.function;
          promise.row.value.textContent = textVal;
        }; break;
        default: {
          // textVal = JSON.stringify(data.value);
          textVal = data.value.type;
          promise.row.value.textContent = textVal;
        }
      }
    },
    shoot_toplevel: function(message) {
      var data = message.data;
      var promise = promises[data.id];

      console.log('shoot_toplevel', promise.topLevel);

      if (!promise || !promise.topLevel) return;

      promise.topLevel = false;

      var parentElement = promise.row.item.parentElement;

      if (parentElement) {
        parentElement.removeChild(promise.row.item);
        checkTbody(parentElement);
      }
    }
  };

  window.addEventListener('message', function(e) {
    var data = e.data;

    if (data && data.action && actions[data.action]) {
      actions[data.action](data.message);
    }
  });

  window.PromisesPanel = {
    updateSetting: function(setting, value) {
      var settingsActors = PromisesPanel.settingsActors;

      if (settingsActors.hasOwnProperty(setting)) {
        settingsActors[setting](value);
      }
    },
    settingsActors: {
      show_full_stack: function(value) {
        PromisesPanel.settings.show_full_stack = !!value;
      }
    },
    settings: {
      show_full_stack: false
    }
  };
}());