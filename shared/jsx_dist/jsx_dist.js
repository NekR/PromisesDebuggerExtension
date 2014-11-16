var jsx = require('jsx');

jsx.register('Blah', {
  renderer: function(JSX) {
    return JSX.tag('div', null, [
      'blah cont: ',
      this.children
    ]);
  }
});

jsx.register('Head', {
  renderer: function(JSX) {
    return JSX.tag('div', null, [
      JSX.tag('h4', { '#default': { class: 'ui top black attached header pd-main-header' } }, [
        JSX.tag('div', { '#default': { class: 'pd-header-icons' } }, [
          JSX.tag('i', {
            '#default': {
              class: 'setting icon link',
              title: 'Settings',
              role: 'button'
            },
            ui: {
              control: 'settings-button',
              popup: '#settings'
            }
          }),
          JSX.tag('i', {
            '#default': {
              class: 'ban circle icon link',
              title: 'Clear',
              role: 'button'
            },
            ui: { control: 'clear-button' }
          })
        ]),
        'Promises Debugger\r\n    ',
        JSX.tag('div', {
          '#default': {
            class: 'attach-toggle',
            role: 'button'
          },
          ui: {
            control: 'attach-toggle',
            props: {
              id: 'attach-toggle',
              selected: false
            }
          }
        }, [
          '',
          JSX.tag('div', { '#default': { class: 'attach-toggle-ball' } })
        ])
      ]),
      JSX.tag('div', { '#default': { class: 'pd-table celled' } }, [
        '',
        JSX.tag('div', { '#default': { class: 'pd-table-head' } }, [
          '',
          JSX.tag('div', { '#default': { class: 'pd-table-row' } }, [
            '',
            JSX.tag('div', { '#default': { class: 'pd-table-row-cont' } }, [
              JSX.tag('div', { '#default': { class: 'pd-table-cell-header' } }, ['ID']),
              JSX.tag('div', { '#default': { class: 'pd-table-cell-header' } }, ['Promise']),
              JSX.tag('div', { '#default': { class: 'pd-table-cell-header' } }, ['Status']),
              JSX.tag('div', { '#default': { class: 'pd-table-cell-header' } }, ['Value']),
              JSX.tag('div', { '#default': { class: 'pd-table-cell-header' } }, ['Chain'])
            ])
          ])
        ])
      ])
    ]);
  }
});

jsx.register('NeedReload', {
  renderer: function(JSX) {
    return JSX.tag('div', { '#default': { class: 'ui warning message' } }, [
      null,
      '\r\n  ',
      JSX.tag('div', { '#default': { class: 'ui segment vertical' } }, [
        JSX.tag('div', {
          '#default': {
            class: 'primary ui button small',
            role: 'button'
          },
          ui: {
            control: 'attach-button',
            props: {
              serviceAction: 'reload_and_attach',
              attachToggle: '#attach-toggle'
            }
          }
        }, ['Start Watch & Reload page']),
        JSX.tag('div', {
          '#default': {
            class: 'primary ui button small',
            role: 'button'
          },
          ui: {
            control: 'attach-button',
            props: {
              serviceAction: 'attach',
              attachToggle: '#attach-toggle'
            }
          }
        }, ['Start Watch'])
      ])
    ]);
  }
});

jsx.register('Test', {
  renderer: function(JSX) {
    return JSX.tag('div', { cui: { control: 'tested' } }, [
      'zzZzzzZ -- ',
      this.props.text,
      ' 123\r\n  \r\n  ',
      JSX.tag('Blah', null, ['blah data 2'])
    ]);
  }
});