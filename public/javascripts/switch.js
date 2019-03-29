$('#settings').click(function() {
  if ($('#switchTracking').is(':checked')) {
    $("#onlyonactive").show();
  }
  else{
    $("#onlyonactive").hide();
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

$('#settingsModal').on('hidden.bs.modal', function(){
    $(this).find('form')[0].reset();
});
