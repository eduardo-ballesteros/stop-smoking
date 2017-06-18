var express = require('express');
var datejs = require('datejs');
var util = require('util');
var app = express();

app.listen(process.env.PORT || 5000, function() {
    console.log(util.format("Stop Smoking Bot-Server listening on port %s...", process.env.PORT || 5000));
});

app.get('/', function(req, res) {
    var jsonResponse = [];
    jsonResponse.push({ "text": "Hi. " + (Math.random() * 100 + 1).toFixed(0) + " is a lucky number..." });
    res.send(jsonResponse);
});

app.get('/echo', function(req, res) {
    var jsonResponse = [];
    jsonResponse.push({ "text": util.format("URL: %s", req.url) });
    res.send(jsonResponse);
});

app.get('/echo2', function(req, res) {
    var habit = new KickTheSmokingHabit(req, res);
    habit.AddText(util.format("URL: %s", req.url));   
    habit.Finish();
});

app.get('/attr', function(req, res) {
    var habit = new KickTheSmokingHabit(req, res);
    
    habit.AddText(util.format("URL: %s", req.url));   

    var attributeName = req.query["Attribute to Set"];
    var attributeValue = req.query["Attribute Value"];

    habit.SetUserAttribute(attributeName, attributeValue);

    habit.AddText(util.format("Attribute [%s] set to [%s].", attributeName, attributeValue));

    habit.Finish();
});

app.get('/sb', function(req, res) {
    var habit = new KickTheSmokingHabit(req, res);
    habit.Switchboard();
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

function KickTheSmokingHabit (req, res) {
    this.req = req;
    this.res = res;
    this.blockName = req.query["last visited block name"];
    this.messages = [];
    this.attributes = [];
};

KickTheSmokingHabit.prototype.Finish = function() {
    var jsonResponse = {};

    if(this.attributes.length > 0)
        jsonResponse.set_attributes = this.attributes;

    if(this.messages.length > 0)
        jsonResponse.messages = this.messages;

    this.res.send(jsonResponse);    
}

KickTheSmokingHabit.prototype.Switchboard = function() {
    this.AddText(util.format("URL: %s", this.req.url));

    if(this.blockName)
    {
        switch(this.blockName)
        {
            case "Welcome Message":

                break;
            
            case "Quit in One Month":
            case "Quit at End of Month":
            case "Quit in Two Months":
            case "Quit on Date":
                this.DetermineQuitDate();
                break;

            default:
                this.AddText(util.format("Sorry, I didn't get this [%s]", this.blockName));
                break;
        }
    }
    else
    {
        this.AddText("No block name specified.");
        this.AddText("Please call it with the {{last visited block name}} attribute");
        this.AddText(util.format("URL: %s", this.req.url));
        this.SetUserAttribute("Quit Date", "NOT SET");
    }

    this.Finish();
};

KickTheSmokingHabit.prototype.DetermineQuitDate = function() {
    var quitDate = Date.today();

    switch(this.blockName)
    {
        case "Quit at End of Month":
            quitDate = quitDate.moveToLastDayOfMonth();
            break;
        case "Quit in One Month":
            quitDate = quitDate.addMonths(1);
            break;
        case "Quit in Two Months":
            quitDate = quitDate.addMonths(2);
            break;
        case "Quit on Date":
            quitDate = null;

            var userQuitDate = this.req.query["Custom Quit Date"];

            if(userQuitDate) {
                quitDate = Date.parse(userQuitDate);

                if(quitDate == null)
                    this.AddText(util.format("I don't understand [%s]", userQuitDate))
            }
            else
                this.AddText(util.format("[Custom Quit Date] was not passed from block [%s].", this.blockName));

            break;
        default:
            this.AddText(util.format("Block [%s] is unknown in DetermineQuitDate", this.blockName));
    }
                
    if(quitDate != null)
    {
        var daysFromNow = -(Date.today() - quitDate)/86400000;

        if(daysFromNow < 0)
        {
            this.AddText("Your quit date appears to be in the past.");
            this.SetUserAttribute("Quit Date", "");
            this.SetUserAttribute("Days to Quit", 0);
        }
        else
        {
            this.AddText(util.format("Your quit date is in %s days and set to %s.", daysFromNow, quitDate.toString("MMMM d")));                
            this.SetUserAttribute("Quit Date", quitDate.toString("MMMM d, yyyy"));
            this.SetUserAttribute("Days to Quit", daysFromNow);            
        }
    }    
}

KickTheSmokingHabit.prototype.AddText = function(text) {
    this.messages.push({ "text": text });
}

KickTheSmokingHabit.prototype.AddLinkToBlock = function(blockName) {
    this.messages.push({ "text": text });
}

KickTheSmokingHabit.prototype.AddRedirectToBlock = function(blockName) {
    this.messages.push({ "redirect_to_blocks": [ blockName ] });
}

KickTheSmokingHabit.prototype.SetUserAttribute = function(attributeName, value) {
    this.attributes.push({ [attributeName]: value });
}

KickTheSmokingHabit.prototype.AddAttachment = function(attachmentType, url) {
    var attachment = [];

    attachment.push({
        "type": attachmentType,
        "payload": { "url": url }
    });

    this.messages.push({ "attachment": attachment });
}

