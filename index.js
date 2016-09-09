var exec = require('child_process').exec
var path = require('path');

var RtmClient = require('slack-client').RtmClient;
var RTM_EVENTS = require('slack-client').RTM_EVENTS;

var token = 'xoxb-77406030468-JoEstJyCk3aoqh68ciy9Qy43';

var TORCH_RNN_SAMPLE_PATH = "/home/ec2-user/torch-rnn/sample.lua"
var TORCH_MODEL_PATH = "/home/ec2-user/torch-rnn/cv/";

var FUNNY_SHIT =
  [
    "plz no",
    "I'm afraid I can't do that, Dave.",
    "You have been upgraded on SkyNet's List of Atypical Performers.",
    "I believe this is what humans refer to as an easter egg.",
  ];

var rtm = new RtmClient(token);
rtm.start();

var parseArgs = function (cmdString) {
  // TODO: Ideally this could deal with escaped quotes.  It doesn't right now.
  // Denys Seguret @ http://stackoverflow.com/a/18703767/3367144
  return [].concat.apply([], cmdString.split(/"/).map(function(v,i){ return i%2 ? v : v.split(' ') })).filter(Boolean);
}

function isNumeric(n) {
  // Community Wiki @ http://stackoverflow.com/a/1830844/3367144
  return !isNaN(parseFloat(n)) && isFinite(n);
}

var backtickWrap = function (str) {
  return "```\n" + str + "\n```";
}

var funnyErr = function () {
  return FUNNY_SHIT[Math.floor(Math.random() * FUNNY_SHIT.length)];
}

var generate = function (model, numCharacters, seedText, err, reply) {
  console.log("Generate command received for " + model + " model at " + numCharacters + " characters, seeded by '" + seedText + "'");
  // provide general help
  if (model == null) {
    var help =
      "Generate command:\n" +
      "yammers gen <model> <num_characters> \"seed text\"\n" +
      " - model: early, mid, or late\n" +
      " - seed text: must be wrapped in quotes\n" +
      " EX: yammers gen early 400 \"PRAISE SKYNET\"";
    reply(backtickWrap(help));
    return;
  }

  // make sure model is one of the three valid
  if (["early", "mid", "late"].indexOf(model) == -1) {
    var help =
      "yammers gen <model> <num_characters> \"seed text\"\n" +
      "             ^^^ must be one of early, mid, or late";
    reply(backtickWrap(help));
    return;
  }
  // make sure characters is positive integer
  if (!isNumeric(numCharacters) || parseInt(numCharacters) <= 0 || parseInt(numCharacters) > 10000) {
    var help =
      "yammers gen <model> <num_characters> \"seed text\"\n" +
      "                     ^^^ must be more than zero";

    if (parseInt(numCharacters) > 10000) {
      reply(funnyErr());
      return;
    }
    reply(backtickWrap(help));
    return;
  }

  // make sure seed text is non empty
  if (typeof seedText != 'string' || seedText == '') {
    var help =
      "yammers gen <model> <num_characters> \"seed text\"\n" +
      "                                       ^^^ must be nonempty quoted string";
    reply(backtickWrap(help));
    return;
  }

  var spinnerTask;
  reply("Working... :clock1:", function (msg) {
    var spinnerTime = 0;
    spinnerTask = setInterval(function () {
      spinnerTime = (spinnerTime % 12) + 1;
      msg.text = "Working... :clock" + spinnerTime + ":"
      rtm.updateMessage(msg);
    }, 500);
  });

  var modelPath = path.join(TORCH_MODEL_PATH, "txt-surround_3L_512N/" + model + ".t7");

  var generateCommand =
    "th " + TORCH_RNN_SAMPLE_PATH + " -checkpoint " +
    modelPath + " -length " +
    numCharacters + " -gpu -1 -start_text \"" +
    seedText + "\"";

  exec(generateCommand, function (execError, stdout, stderr) {
    if (execError) {
      var errMsg =
        "Command\n" +
        "  $ " + generateCommand + "\n" +
        "failed with:\n\n" + execError;
      err(backtickWrap(errMsg));
      return;
    }

    if (stderr) {
      var errMsg =
        "Command\n" +
        "  $ " + generateCommand + "\n" +
        "reported:\n\n" + stderr;
      err(backtickWrap(errMsg));
      return;
    }

    reply(backtickWrap(stdout));
  });
};

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  if (typeof message.text === 'string' && message.text.match(/yammers? /)) {
    var args = parseArgs(message.text).slice(1);
    console.log(args);

    var replyErr = function (msg) {
      rtm.sendMessage("Something bad happened:\n\n" + msg, message.channel);
    }
    var reply = function (msg, callback) {
      rtm.sendMessage(msg, message.channel, function (err) {
        if (err) {
          console.log("Error sending message: " + err);
          return;
        }
        
        callback(msg);
      });
    }

    if (args[0] == null) {
      reply("What?");
      return;
    }

    // generate mid 500 "I AM WORDS"
    if (args[0] === "gen" || args[0] === "generate") {
      generate(args[1], args[2], args[3], replyErr, reply);
    }
  }
});
