$('#settings').click(function() {
  if ($('#switchTracking').is(':checked')) {
    $("#onlyonactive").show();
  }
  else{
    $("#onlyonactive").hide();
  }
  if ($('#switchPauseLabel').is(':checked')) {
    $("#pauseLabelSection").show();
  }
  else{
    $("#pauseLabelSection").hide();
  }
});

$('#switchTracking').click(function() {
  if ($('#switchTracking').is(':checked')) {
    $("#onlyonactive").show();
  }
  else{
    $("#onlyonactive").hide();
  }
});

$('#switchPauseLabel').click(function() {
  if ($('#switchPauseLabel').is(':checked')) {
    $("#pauseLabelSection").show();
  }
  else{
    $("#pauseLabelSection").hide();
  }
});

$('#settingsModal').on('hidden.bs.modal', function(){
    $(this).find('form')[0].reset();
});

$( document ).ready(function() {
  if ($('#cookie-disclaimer').is(':checked')) {
    $("#start").removeAttr('disabled');
  }
  else{
        $("#start").prop('disabled', true);
  }
});

$('#cookie-disclaimer').click(function() {
  if ($('#cookie-disclaimer').is(':checked')) {
    $("#start").removeAttr('disabled');
  }
  else{
        $("#start").prop('disabled', true);
  }
});
