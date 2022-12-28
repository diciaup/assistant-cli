import { ChatGPTAPI } from './chatgpt-api';
import {ALTERNATIVE_USER_AGENT, USER_AGENT} from "./browser-commands/constants";
import { routes } from './browser-commands/execute-browser';
const { execSync } = require('child_process');
const electronPath = require("electron");
const fs = require('fs');
const Spinner = require('cli-spinner').Spinner;
const readline = require('readline');
const cliMd = require('cli-md')


const loadingSpinner = new Spinner('processing... %s');
loadingSpinner.setSpinnerString('|/-\\');
const localStorageLocation = `${__dirname}/../localStorage`;

let authTry = 0;

export const runSandbox = (route: string) => {
  const path = `${__dirname}/browser-commands/execute-browser.js`;
  console.log(route, electronPath.shell.openPath());
  if(typeof electronPath === 'object') {
    routes[route]();
  }else {
    const message = execSync(`${electronPath} --no-logging ${path}`, { stdio: [], env: {...process.env, ...{ROUTE: route, ELECTRON_ENABLE_LOGGING: 0}}}).toString().split('data: ');
    if(message.length > 1) {
      try {
          const token = JSON.parse(message[1]);
          if(token) {
            fs.writeFileSync(localStorageLocation, JSON.stringify(token));
            return token;
          }
        } catch(e) {
          console.log('original message', message.toString());
          throw e;
        }
    }
  }
  
}

const getClient = async () => {
  let tokens;
  try {
    tokens = JSON.parse(fs.readFileSync(localStorageLocation).toString());
  } catch(e) {}
  if(!(tokens && tokens.token && tokens.clearanceToken)) {
    tokens = runSandbox('GET_SESSION_TOKEN');
    return getClient();
  }
  const api = new ChatGPTAPI({
    sessionToken: tokens.token,
    clearanceToken: tokens.clearanceToken,
    debug: process.env.ENV === 'dev',
    userAgent: currentUserAgent
  });
  const authenticated = await api.getIsAuthenticated();
  if (authenticated.type !== 'code') {
    tokens = runSandbox('GET_SESSION_TOKEN');
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
  runSandbox('CLEAN');
  if(fs.existsSync(localStorageLocation)) {
    fs.rmSync(localStorageLocation);
  }
  console.log('Cache cleaned!');
}

const getVersion = () => {
  const version = JSON.parse(fs.readFileSync(`${__dirname}/../package.json`).toString()).version;
  console.log(version);
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
  'version': getVersion,
  'clean': resetAuth
};


export let currentUserAgent = USER_AGENT;

export const toggleUserAgent = () => {
  if(currentUserAgent === ALTERNATIVE_USER_AGENT) {
    currentUserAgent = USER_AGENT;
  }else {
    currentUserAgent = ALTERNATIVE_USER_AGENT;
  }
}


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
  const conversation = api.getConversation();
  const def = commands[args.join(' ')];
  if(def) {
    def(conversation);
  }else {
    loadingSpinner.start();
    let response = await conversation.sendMessage(args.join(' '));
    if(response.startsWith('Too many requests in 1 hour.')) {
      toggleUserAgent();
      response = await conversation.sendMessage(args.join(' '));
    }
    loadingSpinner.stop(true);
    console.log(cliMd(response));
  }
})().catch((err) => console.log(err));
