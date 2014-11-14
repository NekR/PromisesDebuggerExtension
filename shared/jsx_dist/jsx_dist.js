var jsx = require('jsx');

jsx.register('Blah', {
  renderer: function(JSX) {
    return JSX.tag('div', null, [
      'blah cont: ',
      this.children,
      ''
    ]);
  }
});

jsx.register('Test', {
  renderer: function(JSX) {
    return JSX.tag('div', { 'cui:control': 'tested' }, [
      'zzZzzzZ -- ',
      this.props.text,
      ' 123\r\n  \r\n  ',
      JSX.tag('Blah', null, ['blah data 2'])
    ]);
  }
});