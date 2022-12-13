import { ChatGPTAPI } from './chatgpt-api';
const { execSync } = require('child_process');
const electronPath = require("electron");
const fs = require('fs');
const Spinner = require('cli-spinner').Spinner;
const readline = require('readline');
const cliMd = require('cli-md')


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
  console.log(electronPath);
  return ;
}

let authTry = 0;
const getToken = (clearCache) => {
  const path = `${__dirname}/fetch-token.js`;
  const message = execSync(`${electronPath} ${path}`, {env: {...process.env, ...{CLEAR_CACHE: clearCache}}});
  if(message.length > 0) {
    try {
        const token = JSON.parse(message.toString());
        if(token) {
          fs.writeFileSync(localStorageLocation, message);
          return token;
        }
      } catch(e) {
        console.log('original message', message.toString());
        throw e;
      }
  }
}

const getClient = async () => {
  let tokens;
  try {
    tokens = JSON.parse(fs.readFileSync(localStorageLocation).toString());
  } catch(e) {}
  if(!tokens) {
    tokens = getToken(false);
  }
  const api = new ChatGPTAPI({
    sessionToken: tokens.token,
    clearanceToken: tokens.clearanceToken,
    debug: process.env.ENV === 'dev',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
  });
  const authenticated = await api.getIsAuthenticated();
  if (!authenticated) {
    tokens = getToken(false);
    authTry++;
    if(authTry === 3) {
      throw new Error("Authentication error, there is an error integrating with ChatGPT Service");
    }
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

const resetAuth = () => {
  getToken(true);
  if(fs.existsSync(localStorageLocation)) {
    fs.rmSync(localStorageLocation);
  }
  console.log('Cache cleaned!');
}

const commands = {
  'open chat': startConversation,
  'start conversation': startConversation,
  'start chat': startConversation,
  'chat': startConversation
};

const unnecessaryClientCommand = {
  'reset auth': resetAuth,
  'clear session': resetAuth,
  'clean': resetAuth
};


(async () => {
  if(parseInt(process.versions.node.split(".")[0], 10) < 16) {
    console.error('You are using a node version earlier than 16, please update it and retry');
    return;
  }
  const args = process.argv.slice(4);
  const noClientDef = unnecessaryClientCommand[args.join(' ')];
  if(noClientDef) {
    noClientDef();
    return;
  }
  const api = await getClient();
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
