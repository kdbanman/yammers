var RtmClient = require('slack-client').RtmClient;
var RTM_EVENTS = require('slack-client').RTM_EVENTS;

var token = 'xoxb-77406030468-JoEstJyCk3aoqh68ciy9Qy43';

var rtm = new RtmClient(token);
rtm.start();



var generate = function (model, numCharacters, seedText, err) {
  console.log(model, numCharacters);

  // make sure model is one of the three things
  // make sure characters is positive integer
  // make sure seed text is non empty

};

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  if (typeof message.text === 'string' && message.text.match(/yammers? /)) {
    // DO NOT SPLIT "" or ''
    args = message.text.split(' ').slice(1);
    console.log(args);

    var replyErr = function (msg) {
      console.log("I was supposed to reply with " + msg);
    }

    if (args[0] === "gen" || args[0] === "generate") {
      generate(args[1], args[2], args[3], replyErr);
    }
  }
});

