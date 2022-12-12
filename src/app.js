const spawn = require("spawno"),
    oArgv = require("oargv"),
    electronPath = require("electron");
const fs = require('fs');
const Spinner = require('cli-spinner').Spinner;
const prompt = require("prompt-sync")({ sigint: true });
const readline = require('readline');
let cliMd;


const loadingSpinner = new Spinner('processing... %s');
loadingSpinner.setSpinnerString('|/-\\');
const localStorageLocation = `${__dirname}/../localStorage`;

function execElectron(path, options, callback, clearCache = false) {

  if (!path) {
      return callback(new Error("The path argument is mandatory."));
  }

  if (typeof options === "function") {
      callback = options;
      options = null;
  }

  options = options || {};
  options._ = [path];

  var cwd = options.cwd || process && process.cwd() || __dirname;
  delete options.cwd;

  return spawn(electronPath, oArgv(options), { cwd: cwd, env: {CLEAR_CACHE: clearCache}, _showOutput: process.env.ENV === 'dev'}, callback);
}

const getToken = (clearCache) => {
  const childProcess = execElectron(`${__dirname}/fetch-token.js`, undefined, undefined, clearCache);
  return new Promise((resolve, reject) => {
    childProcess.stdout.on('data', (message) => {
      try {
        const token = JSON.parse(message.toString());
        if(token) {
          fs.writeFileSync(localStorageLocation, message);
          resolve(token);
        }
      } catch(e) {
        console.log('original message', message.toString());
        reject(e);
      }
    })
  });
}


const getClient = async () => {
  const {ChatGPTAPI} = await import('chatgpt');
  let tokens;
  try {
    tokens = JSON.parse(fs.readFileSync(localStorageLocation).toString());
  } catch(e) {}
  if(!tokens) {
    tokens = await getToken(false);
  }
  const api = new ChatGPTAPI({
    sessionToken: tokens.token,
    clearanceToken: tokens.clearanceToken,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
  });
  const authenticated = await api.getIsAuthenticated();
  if (!authenticated) {
    tokens = await getToken(false);
    return getClient();
  }
  return api;
}

const useConversation = (conversationApi, rl, answer = "Hello how can i help you?") => {
  rl.question(`${cliMd('🤖 ' + answer)}> `, (request) => {
    if(request.length > 0) {
       loadingSpinner.start();
       conversationApi.sendMessage(request).then(res => {
        useConversation(conversationApi, rl, res);
      })
      .catch(e => useConversation(conversationApi, rl, e))
      .finally(() => loadingSpinner.stop(true));
    }else {
      useConversation(conversationApi, rl, 'Please write a message');
    }
  })
  };

const startConversation = (conversationApi) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  useConversation(conversationApi, rl);
}

const resetAuth = async () => {
  fs.rmSync(localStorageLocation);
  await getToken(true);
}


const commands = {
  'open chat': startConversation,
  'start conversation': startConversation,
  'start chat': startConversation,
  'reset auth': resetAuth,
  'clear session': resetAuth,
  'chat': startConversation
};


(async () => {
  if(parseInt(process.versions.node.split(".")[0], 10) < 16) {
    console.error('You are using a node version earlier than 16, please update it and retry');
    return;
  }
  cliMd = (await import('cli-markdown')).default;
  const api = await getClient();
  const args = process.argv.slice(4);
  const def = commands[args.join(' ')];
  if(def) {
    def(api.getConversation());
  }else {
    loadingSpinner.start();
    const response = await api.sendMessage(args.join(' '));
    loadingSpinner.stop(true);
    console.log(cliMd(response));
  }
})().catch((err) => console.log(err));
