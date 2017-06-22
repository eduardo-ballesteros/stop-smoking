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
    this.isDebugMode = req.query["debug"] == "yes";
    this.messages = [];
    this.attributes = {};
    this.hasAttributes = false;
    this.cigaretteCounter = [];
};

KickTheSmokingHabit.prototype.Finish = function() {
    var jsonResponse = {};

    if(this.hasAttributes)
        jsonResponse.set_attributes = this.attributes;

    if(this.messages.length > 0)
        jsonResponse.messages = this.messages;

    //TODO: Calculate Days to Quit if Quit Date is set.

    this.res.send(jsonResponse);    
}

KickTheSmokingHabit.prototype.Switchboard = function() {
    if(this.isDebugMode)
        this.AddText(util.format("URL: %s", this.req.url));

    if(this.blockName)
    {
        switch(this.blockName.toLowerCase())
        {
            case "welcome message":
                var firstVisitDate = this.req.query["First Visit Date"];

                if(firstVisitDate == null || firstVisitDate == "")
                    this.SetUserAttribute("First Visit Date", Date.today());

                break;

            case "pleasant activities":
                this.RecordPleasantActivity();
                break;
            
            case "quit in one month":
            case "quit at end of month":
            case "quit in two months":
            case "quit on date":
                this.DetermineQuitDate();
                break;

            case "record count":
                this.RecordCigaretteCount();
                break;

            case "feeling down":
                this.RandomPleasantActivity();
                break;

            default:
                this.AddText(util.format("Sorry, I didn't get this block name chat[%s]", this.blockName));
                break;
        }
    }
    else
    {
        if(this.isDebugMode)
        {
            this.AddText("No block name specified.");
            this.AddText("Please call it with the {{last visited block name}} attribute");
            this.AddText(util.format("URL: %s", this.req.url));
        }
        else
            this.AddText("Ooops, something went wrong.");
    }

    this.Finish();
};

KickTheSmokingHabit.prototype.RecordPleasantActivity = function() {
    var pleasantActivity = this.req.query["Pleasant Activity"];
    var activityListJson = this.req.query["Pleasant Activity Array"];
    var activityList = [];

    if(activityListJson)
        activityList = JSON.parse(activityListJson);    
    
    activityList.push(pleasantActivity);

    this.SetUserAttribute("Pleasant Activity Array", JSON.stringify(activityList));
    this.SetUserAttribute("Has Pleasant Activities", "Yes");
}

KickTheSmokingHabit.prototype.RandomPleasantActivity = function() {
    var activityListJson = this.req.query["Pleasant Activity Array"];
    var activityList = [];

    if(activityListJson)
    {
        activityList = JSON.parse(activityListJson);    

        if(activityList.length > 0)
        {
            var index = activityList.length * Math.random();
            this.AddText('"' + activityList[index] + '"');
        }
        else
        {
            this.AddText("You haven't told me about activities that you enjoy. If you tell me some, I'll remind you of one when you are feeling down.");
        }
    }
    else
    {
        this.AddText("You haven't told me about activities that you enjoy. If you tell me some, I'll remind you of one when you are feeling down.");
    }
}

KickTheSmokingHabit.prototype.ChartCigaretteCount = function() {
    if(cigaretteCounter.length > 0)
    {
        var dataPoints = "";
        for(var i = 0; i < cigaretteCounter.length; i++)
        {
            if(dataPoints == "")
                dataPoints = dataPoints + ","
            dataPoints = dataPoints + cigaretteCounter[i].count.toString();
        }
        var url = util.format("http://chart.googleapis.com/chart?cht=lc&chtt=Cigarettes+Smoked&chs=250x150&chd=t:%s&chds=a&chxt=y", dataPoints);
        this.AddAttachment("image", url);

        if(this.isDebugMode)
            this.AddText(util.format("Image URL: %s", url));
    }
}

KickTheSmokingHabit.prototype.DeserializeUserAttributes = function() {
    var cigaretteCounterJson = this.req.query["Counter Array"];

    if(cigaretteCounterJson)
        this.cigaretteCounter = JSON.parse(cigaretteCounterJson);
}

KickTheSmokingHabit.prototype.RecordCigaretteCount = function() {
    var yesterdaysCount = this.req.query["Cigarette Count"];

    this.DeserializeUserAttributes();    
    this.cigaretteCounter.push({"date": Date.today().setTimeToNow(), "count": yesterdaysCount});    
    this.SetUserAttribute("Counter Array", JSON.stringify(this.cigaretteCounter));
    this.ChartCigaretteCount();
}

KickTheSmokingHabit.prototype.DetermineQuitDate = function() {
    var quitDate = Date.today();

    switch(this.blockName.toLowerCase())
    {
        case "quit at end of month":
            quitDate = quitDate.moveToLastDayOfMonth();
            break;
        case "quit in one month":
            quitDate = quitDate.addMonths(1);
            break;
        case "quit in two months":
            quitDate = quitDate.addMonths(2);
            break;
        case "quit on date":
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
    this.attributes[attributeName] = value;
    this.hasAttributes = true;
}

KickTheSmokingHabit.prototype.AddAttachment = function(attachmentType, url) {
    var attachment = {};

    attachment.push({
        "type": attachmentType,
        "payload": { "url": url }
    });

    this.messages.push({ "attachment": attachment });
}