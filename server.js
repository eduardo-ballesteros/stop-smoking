var express = require('express');
var app = express();

app.listen(3000, function() {
    console.log('Stop Smoking Bot-Server listening on port 3000...');
});

app.get('/*', function(req, res) {
    var jsonResponse = [];
    jsonResponse.push({ "text": "Hi. " + (Math.random() * 100 + 1).toFixed(0) + " is a lucky number..." });
    res.send(jsonResponse);
});