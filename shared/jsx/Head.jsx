<div>
  <h4 class="ui top black attached header pd-main-header">
    <div class="pd-header-icons">
      <i class="setting icon link"
        title="Settings"
        role="button"
        ui:control="settings-button"
        ui:popup="#settings"
      ></i><i class="ban circle icon link"
        title="Clear"
        role="button"
        ui:control="clear-button"
      ></i>
    </div>
    Promises Debugger
    <div class="attach-toggle"
      role="button"
      ui:control="attach-toggle"
      ui:props={{
        id: 'attach-toggle',
        selected: false
      }}
    >
      <div class="attach-toggle-ball"></div>
    </div>
  </h4>
  <div class="pd-table celled">
    <div class="pd-table-head">
      <div class="pd-table-row">
        <div class="pd-table-row-cont">
          <div class="pd-table-cell-header">ID</div>
          <div class="pd-table-cell-header">Promise</div>
          <div class="pd-table-cell-header">Status</div>
          <div class="pd-table-cell-header">Value</div>
          <div class="pd-table-cell-header">Chain</div>
        </div>
      </div>
    </div>
  </div>
</div>