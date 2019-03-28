var button = document.getElementById('customSwitch1');

button.onclick = function() {
    var div = document.getElementById('onlyonactive');
    if (div.style.display !== 'none') {
        div.style.display = 'none';
    }
    else {
        div.style.display = 'block';
    }
};
