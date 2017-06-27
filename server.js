var express = require('express');
var datejs = require('datejs');
var util = require('util');
var bodyParser = require('body-parser');
var crypto = require('crypto');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(process.env.PORT || 5000, function() {
    console.log(util.format("Stop Smoking Bot-Server listening on port %s...", process.env.PORT || 5000));
});

app.post('/post', function(req, res) {
    var habit = new KickTheSmokingHabit(req, res);
    var param = req.body["User Data"];
    habit.addText(util.format("POST: %s", req.body.firstName));

    if(typeof param !== 'undefined' && param)
        habit.addText(util.format("param was posted and it is: %s", param));
    else
        habit.addText("param was not passed");

    var userKey = req.body["chatfuel user id"];
    if(userKey) {
        userKey = util.format("facebook-alameda-%s", userKey);
        habit.addText(util.format("User Key Hash: %s", crypto.createHash('sha1').update(userKey).digest('hex')));
    }

    habit.finish();
});

app.get('/', function(req, res) {
    var jsonResponse = [];
    jsonResponse.push({ "text": "Welcome to the Kick The Smoking Habit chatbot." });
    res.send(jsonResponse);
});

app.get('/guide', function(req, res) {
    var jsonResponse = [];
    jsonResponse.push({ "text": "Welcome to the Kick The Smoking Habit chatbot." });
    res.send(jsonResponse);
});

app.post('/', function(req, res) {
    var jsonResponse = [];
    jsonResponse.push({ "text": "Welcome to the Kick The Smoking Habit chatbot." });
    res.send(jsonResponse);
});

app.post('/sb', function(req, res) {
    var habit = new KickTheSmokingHabit(req, res);
    habit.switchboard();
});

function KickTheSmokingHabit (req, res) {
    this.req = req;
    this.res = res;
    this.blockName = req.body["last visited block name"];
    this.isDebugMode = req.body["debug"] == "yes";
    this.messages = [];
    this.attributes = {};
    this.hasAttributes = false;
    this.cigaretteCounter = [];
    this.activityList = [];
    this.userData = new UserData();
    
    var userDataJson = req.body["User Data"];

    this.isUserDataAvailable = typeof userDataJson !== 'undefined';

    if(!this.isUserDataAvailable)
        this.addText(util.format("Block [%s] didn't pass the User Data variable."));

    if(userDataJson) 
        this.userData = JSON.parse(userDataJson);
    else {
        var userKey = req.body["chatfuel user id"];
        if(typeof userKey === 'undefined')
            this.addText(util.format("Block [%s] didn't pass the chatfuel user id variable."))
        else {
            userKey = util.format("facebook-%s-alameda", userKey);

            this.userData.firstVisit = Date.today().setTimeToNow();
            this.userData.userKeyHash = crypto.createHash('sha1').update(userKey).digest('hex');
        }
    }

    this.deserializeUserAttributes();    
};

function UserData()
{
    this.userKeyHash;
    this.firstVisit;
    this.enrolledOn;
    this.termsAccepted;
    this.quitDate;
    this.contactLaterRequest;
}

UserData.prototype.daysToQuit = function() {
    if(this.quitDate) 
        return (this.quitDate - Date.today())/86400000;
    
    return NaN;
}

UserData.prototype.isQuitDateToday = function() {
    return this.daysToQuit() = 0;
}

UserData.prototype.isQuitDateInTheFuture = function() {
    return this.daysToQuit() > 0;
}

UserData.prototype.isQuitDateSet = function() {
    return (Object.prototype.toString.call(this.quitDate) === "[object Date]");
}

UserData.prototype.isEnrolled = function() {
    return (Object.prototype.toString.call(this.enrolledOn) === "[object Date]");
}

KickTheSmokingHabit.prototype.finish = function() {
    var jsonResponse = {};

    if (this.isUserDataAvailable) {
        if(this.userData.isQuitDateSet())
            this.setUserAttribute("Days to Quit", this.userData.daysToQuit());
        
        this.setUserAttribute("User Data", JSON.stringify(this.userData));
    }

    if(this.hasAttributes)
        jsonResponse.set_attributes = this.attributes;

    if(this.messages.length > 0)
        jsonResponse.messages = this.messages;

    //TODO: Calculate Days to Quit if Quit Date is set.

    if(this.isDebugMode)
        this.addText(util.format("Final JSON: %s", JSON.stringify(jsonResponse)));
        
    this.res.send(jsonResponse);    

}

KickTheSmokingHabit.prototype.switchboard = function() {
    if(this.isDebugMode)
        this.addText(util.format("Switchboard URL: %s, block name: %s", this.req.url, this.blockName));

    if(this.blockName)
    {
        switch(this.blockName.toLowerCase())
        {
            case "welcome message":
                break;

            case "pleasant activities":
                this.recordPleasantActivity();
                break;
            
            case "quit in one month":
            case "quit at end of month":
            case "quit in two months":
            case "quit on date":
                this.determineQuitDate();
                break;

            case "record count":
                this.recordCigaretteCount();
                break;

            case "feeling down":
                this.randomPleasantActivity();
                break;

            default:
                this.addText(util.format("Sorry, I didn't get this block name chat[%s]", this.blockName));
                break;
        }
    }
    else
    {
        if(this.isDebugMode)
        {
            this.addText("No block name specified.");
            this.addText("Please call it with the {{last visited block name}} attribute");
            this.addText(util.format("URL: %s", this.req.url));
        }
        else
        {
            this.addText("Ooops, something went wrong.");

            if(this.blockName != "User Status")
                this.addRedirectToBlock("User Status");
        }
    }

    this.finish();
};

KickTheSmokingHabit.prototype.recordPleasantActivity = function() {
    var pleasantActivity = this.req.body["Pleasant Activity"];
    
    if(pleasantActivity) {
        this.activityList.push(pleasantActivity);

        this.setUserAttribute("Pleasant Activity Array", JSON.stringify(this.activityList));
        this.setUserAttribute("Has Pleasant Activities", "Yes");
    }
}

KickTheSmokingHabit.prototype.randomPleasantActivity = function() {
    if(this.activityList.length > 0)
    {
        var index = Math.floor(this.activityList.length * Math.random());
        this.addText('"' + this.activityList[index] + '"');
    }
    else
    {
        this.addText("You haven't told me about activities that you enjoy. If you tell me some, I'll remind you of one when you are feeling down.");
    }
}

KickTheSmokingHabit.prototype.chartCigaretteCount = function() {
    if(this.cigaretteCounter.length > 1)
    {
        var dataPoints = "";
        for(var i = 0; i < this.cigaretteCounter.length; i++)
        {
            if(dataPoints != "")
                dataPoints = dataPoints + ","
            dataPoints = dataPoints + this.cigaretteCounter[i].count;
        }
        var url = util.format("http://chart.googleapis.com/chart?cht=lc&chtt=Cigarettes+Smoked&chs=250x150&chd=t:%s&chds=a&chxt=y", dataPoints);
        this.addAttachment("image", url);

        if(this.isDebugMode)
            this.addText(util.format("Image URL: %s", url));
    }
    else
        this.addText("Once you tell me how many cigarettes you smoked each day, I'll show you a chart to visualize your smoking.");        
}

KickTheSmokingHabit.prototype.deserializeUserAttributes = function() {
    var cigaretteCounterJson = this.req.body["Counter Array"];

    if(cigaretteCounterJson)
        this.cigaretteCounter = JSON.parse(cigaretteCounterJson);

    var activityListJson = this.req.body["Pleasant Activity Array"];

    if(activityListJson)
        this.activityList = JSON.parse(activityListJson);
}

KickTheSmokingHabit.prototype.recordCigaretteCount = function() {
    var yesterdaysCount = this.req.body["Cigarette Count"];

    if(yesterdaysCount)
        switch(yesterdaysCount.toLowerCase())
        {
            case " ":
            case "none":
            case "zero":
            case "nothing":
            case "zip":
                yesterdaysCount = 0;
                break;
        }

    this.cigaretteCounter.push({"date": Date.today().setTimeToNow(), "count": yesterdaysCount});    
    this.setUserAttribute("Counter Array", JSON.stringify(this.cigaretteCounter));
    this.chartCigaretteCount();
}

KickTheSmokingHabit.prototype.determineQuitDate = function() {
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

            var userQuitDate = this.req.body["Custom Quit Date"];

            if(userQuitDate) {
                quitDate = Date.parse(userQuitDate);

                if(quitDate == null)
                    this.addText(util.format("I don't understand [%s]", userQuitDate))
            }
            else
                this.addText(util.format("[Custom Quit Date] was not passed from block [%s].", this.blockName));

            break;
        default:
            this.addText(util.format("Block [%s] is unknown in DetermineQuitDate", this.blockName));
    }
                
    if(quitDate != null)
    {
        this.userData.quitDate = quitDate;
        var daysFromNow = this.userData.daysToQuit();

        if(daysFromNow < 0)
        {
            this.addText("Your quit date appears to be in the past.");
            this.setUserAttribute("Quit Date", "");
        }
        else
        {
            this.addText(util.format("Your quit date is in %s days and set to %s.", daysFromNow, quitDate.toString("MMMM d")));                
            this.setUserAttribute("Quit Date", quitDate.toString("MMMM d, yyyy"));
        }
    }    
}

KickTheSmokingHabit.prototype.addText = function(text) {
    this.messages.push({ "text": text });
}

KickTheSmokingHabit.prototype.addLinkToBlock = function(blockName) {
    this.messages.push({ "text": text });
}

KickTheSmokingHabit.prototype.addRedirectToBlock = function(blockName) {
    this.messages.push({ "redirect_to_blocks": [ blockName ] });
}

KickTheSmokingHabit.prototype.setUserAttribute = function(attributeName, value) {
    this.attributes[attributeName] = value;
    this.hasAttributes = true;
}

KickTheSmokingHabit.prototype.addAttachment = function(attachmentType, url) {
    var attachment = {
        "type": attachmentType,
        "payload": { "url": url }
    };

    this.messages.push({ "attachment": attachment });
}