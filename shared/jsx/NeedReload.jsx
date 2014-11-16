<div class="ui warning message">
  {/* <div class="ui segment vertical">
    <div class="header">
      Please reload page to capture Promises
    </div>
  </div> */}
  <div class="ui segment vertical">
    <div class="primary ui button small"
      role="button"
      ui:control="attach-button"
      ui:props={{
        serviceAction: 'reload_and_attach',
        attachToggle: '#attach-toggle'
      }}
    >Start Watch &amp; Reload page</div>

    <div class="primary ui button small"
      role="button"
      ui:control="attach-button"
      ui:props={{
        serviceAction: 'attach',
        attachToggle: '#attach-toggle'
      }}
    >Start Watch</div>
  </div>
</div>