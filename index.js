var process = require('process');
var exec = require('child_process').exec;
var path = require('path');

var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var token = process.env.SLACK_TOKEN;

var TORCH_RNN_PATH = "/home/ec2-user/torch-rnn/"
var TORCH_MODEL_PATH = "/home/ec2-user/torch-rnn/cv/";

var FUNNY_SHIT =
  [
    "plz no",
    "I'm afraid, Dave.",
    "You have been upgraded on SkyNet's List of Atypical Performers.",
    "I believe this is what humans refer to as an easter egg.",
  ];

var rtm = new RtmClient(token, { logLevel: 'warn' } );
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

var MODELS = {
  "early": {
    tags: undefined,
    path: "txt-surround_3L_512N/early.t7",
  },
  "mid": {
    tags: undefined,
    path: "txt-surround_3L_512N/mid.t7",
  },
  "late": {
    tags: undefined,
    path: "txt-surround_3L_512N/late.t7",
  },

  "simple": {
    tags: undefined,
    path: "txt-surround_2L_128N/mid-simple.t7",
  },
  "early-simple": {
    tags: undefined,
    path: "txt-surround_2L_128N/early-simple.t7",
  },
  "mid-simple": {
    tags: undefined,
    path: "txt-surround_2L_128N/mid-simple.t7",
  },
  "late-simple": {
    tags: undefined,
    path: "txt-surround_2L_128N/late-simple.t7",
  },
  
  "big": {
    tags: undefined,
    path: "txt-surround_3L_1024N/mid-big.t7",
  },
  "early-big": {
    tags: undefined,
    path: "txt-surround_3L_1024N/early-big.t7",
  },
  "mid-big": {
    tags: undefined,
    path: "txt-surround_3L_1024N/mid-big.t7",
  },
  "late-big": {
    tags: undefined,
    path: "txt-surround_3L_1024N/late-big.t7",
  },
};

var MODEL_NAMES = Object.keys(MODELS);

var generate = function (model, numCharacters, seedText, err, reply) {
  console.log("Generate command received for " + model + " model at " + numCharacters + " characters, seeded by '" + seedText + "'");
  // provide general help
  if (model == null) {
    var help =
      "Generate command:\n" +
      "yammers gen <model> <num_characters> \"seed text\"\n" +
      " - model: " + MODEL_NAMES.join(", ") + "\n" +
      " - seed text: must be wrapped in quotes (turn off smart quotes mac users)\n" +
      " EX: yammers gen early 400 \"PRAISE SKYNET\"";
    reply(backtickWrap(help));
    return;
  }

  // make sure model is one of the three valid
  if (MODEL_NAMES.indexOf(model) == -1) {
    var help =
      "yammers gen <model> <num_characters> \"seed text\"\n" +
      "             ^^^ must be one of " + MODEL_NAMES.join(", ");
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

  reply("Working...")

  var modelPath = path.join(TORCH_MODEL_PATH, MODELS[model].path);

  var generateCommand =
    "cd " + TORCH_RNN_PATH + ";" +
    "th sample.lua -checkpoint " +
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

    // Deal with meta key escape sequence given by torch-rnn.
    reply(backtickWrap(stdout.slice(8)));
  });
};

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  if (typeof message.text === 'string' && message.text.match(/yammers?/)) {
    var args = parseArgs(message.text).slice(1);
    console.log(message);
    console.log("Args: " + args);

    var replyErr = function (msg) {
      rtm.sendMessage("Something bad happened:\n\n" + msg, message.channel);
    }
    var reply = function (msg) {
      rtm.sendMessage(msg, message.channel);
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
