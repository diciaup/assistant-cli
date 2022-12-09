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

function execElectron(path, options, callback) {

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

  return spawn(electronPath, oArgv(options), { cwd: cwd, _showOutput: process.env.ENV === 'dev'}, callback);
};

const getToken = () => {
  const childProcess = execElectron(`${__dirname}/fetch-token.js`);
  return new Promise((resolve, reject) => {
    childProcess.stdout.on('data', (message) => {
      try {
        const token = JSON.parse(message).token;
        if(token) {
          fs.writeFileSync(localStorageLocation, token);
          resolve(token);
        }
      } catch(e) {
        reject(e);
      }
    })
  });
}


const getClient = async () => {
  const {ChatGPTAPI} = await import('chatgpt');
  let token;
  try {
    token = fs.readFileSync(localStorageLocation).toString();
  } catch(e) {}

  if(!token) {
    token = await getToken();
  }
  const api = new ChatGPTAPI({
    sessionToken: token
  });
  const authenticated = await api.getIsAuthenticated();
  if (!authenticated) {
    token = await getToken();
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


const commands = {
  'open chat': startConversation,
  'start conversation': startConversation,
  'start chat': startConversation,
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
