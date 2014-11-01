const XHTML_NS = "http://www.w3.org/1999/xhtml";
const isChrome = false;

var handleEverStack = function(stack) {
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

  if (true) {
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
};

var makeMessage = function(document, data) {
  let value = data.error.value;
  let provider = data.provider;
  let name = value.name;
  let title = 'Promise reject: ' + (name ? name + ': ' : '') +
    (value.message || '<no message>');

  let messageNode = document.createElementNS(XHTML_NS, 'div');

  messageNode.style.display = 'block';
  messageNode.style.color = '#CD2929';

  let groupTitle = makeGroupTitle(document, title);
  messageNode.appendChild(groupTitle);

  let groupContainer = makeGroupContainer(document);
  messageNode.appendChild(groupContainer);

  groupTitle.addEventListener('click', function() {
    groupContainer.hidden = !groupContainer.hidden;

    var display = groupTitle.cornerOpened.style.display === 'inline-block' ?
      'none' : 'inline-block';

    groupTitle.cornerClosed.style.display =
      (groupTitle.cornerOpened.style.display = display) === 'inline-block' ?
        'none' : 'inline-block';
  });

  let stack = value.stack ? handleEverStack(value.stack) : null;

  if (stack && stack.lines.length) {
    stack.lines.forEach(function(line) {
      let lineNode = makeLogItem(document, line);

      groupContainer.appendChild(lineNode);
    });
  } else {
    let lineNode = makeLogItem(document, '<no stack>');
    
    groupContainer.appendChild(lineNode);
  }

  return messageNode;
},
makeGroupTitle = function(document, title) {
  let groupTitle = document.createElementNS(XHTML_NS, 'div');

  // groupTitle.style.position = 'relative';
  groupTitle.style.cursor = 'pointer';

  let cornerClosed = document.createElementNS(XHTML_NS, 'span');

  cornerClosed.style.display = 'inline-block';
  cornerClosed.style.width = 0;
  cornerClosed.style.height = 0;
  cornerClosed.style.borderTop = '4px solid transparent'
  cornerClosed.style.borderBottom = '4px solid transparent'
  cornerClosed.style.borderLeft = '6px solid #777';
  cornerClosed.style.verticalAlign = 'middle';
  cornerClosed.style.margin = '0 10px 0 0';

  groupTitle.appendChild(cornerClosed);

  let cornerOpened = document.createElementNS(XHTML_NS, 'span');

  cornerOpened.style.display = 'none';
  cornerOpened.style.width = 0;
  cornerOpened.style.height = 0;
  cornerOpened.style.borderLeft = '4px solid transparent'
  cornerOpened.style.borderRight = '4px solid transparent'
  cornerOpened.style.borderTop = '6px solid #777';
  cornerOpened.style.verticalAlign = 'middle';
  cornerOpened.style.margin = '1px 8px 1px 0';

  groupTitle.appendChild(cornerOpened);

  groupTitle.cornerOpened = cornerOpened;
  groupTitle.cornerClosed = cornerClosed;

  let text = document.createElementNS(XHTML_NS, 'span');

  text.textContent = title;
  text.style.fontWeight = 'bold';
  text.style.verticalAlign = 'middle';

  groupTitle.appendChild(text);

  return groupTitle;
},
makeGroupContainer = function(document) {
  let groupContainer = document.createElementNS(XHTML_NS, 'div');

  groupContainer.hidden = true;
  groupContainer.style.margin = '5px 0 5px 15px';
  groupContainer.style.paddingLeft = '14px';
  groupContainer.style.borderLeft = '1px solid #777';

  return groupContainer;
},
makeLogItem = function(document, text) {
  let logItem = document.createElementNS(XHTML_NS, 'div');

  logItem.textContent = text;
  logItem.style.margin = '5px 0';

  return logItem;
};

exports.Logger = function(webConsoleUI) {
  this.ui = webConsoleUI;
};

exports.Logger.prototype = {
  promiseError: function(data) {
    let ui = this.ui;
    let message = makeMessage(ui.document, data);

    message = ui.createMessageNode(3, 0, message, '', 0, '');
    ui.outputMessage(3, message);
  }
};