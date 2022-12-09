const spawn = require("spawno"),
    oArgv = require("oargv"),
    electronPath = require("electron");
const fs = require('fs');
const Spinner = require('cli-spinner').Spinner;
const readline = require('readline');


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

const openChat = () => {
  const interface = readline.createInterface(
     process.stdin, process.stdout);    
};


const commands = {
  'open chat': openChat,
  'start conversation': openChat,
  'start chat': openChat,
  'chat': openChat
};


(async () => {
  const cliMd = (await import('cli-markdown')).default;
  loadingSpinner.start();
  const api = await getClient();
  const args = process.argv.slice(3);
  const def = commands[args.join(' ')];
  console.log(args.join(' '));
  if(def) {
    def();
  }else {
    const response = await api.sendMessage(args.join(' '));
    loadingSpinner.stop(true);
    console.log(cliMd(response));
  }
})().catch((err) => console.log(err));
