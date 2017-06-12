var express = require('express');
var datejs = require('datejs');
var util = require('util');
var app = express();

app.listen(process.env.PORT || 5000, function() {
    console.log('Stop Smoking Bot-Server listening on port 3000...');
});

app.get('/', function(req, res) {
    var jsonResponse = [];
    jsonResponse.push({ "text": "Hi. " + (Math.random() * 100 + 1).toFixed(0) + " is a lucky number..." });
    res.send(jsonResponse);
});

app.get('/val_qd', function(req, res) {
    var jsonResponse = [];
    var quitDateParam = req.query["Quit Date"];
    if(quitDateParam != null && quitDateParam != "")
    {
        var quitDate = Date.parse(quitDateParam);
        if(quitDate == null)
            jsonResponse.push({ "text": util.format("I can't tell what %s is.", quitDateParam) });
        else
        {
            var daysFromNow = quitDate.getOrdinalNumber() - Date.today().getOrdinalNumber();
            jsonResponse.push({ "text": util.format("Quit date is set to %s or %s days from now.", quitDate.toString("MMM d"), daysFromNow) });
        }
    }
    else
    {
        jsonResponse.push({ "text": "Please enter a date for when you want to quit." });
    }
    res.send(jsonResponse);
});