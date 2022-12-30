import { localStorageLocation } from "./browser-commands/constants";
import routes from "./browser-commands/routes";
import { currentUserAgent } from "./browser-commands/toggle-user-agent";
import { ChatGPTAPI } from "./chatgpt-api";

const Spinner = require('cli-spinner').Spinner;
const { execSync } = require('child_process');
const electronPath = require("electron");
const fs = require('fs');
const readline = require('readline');
const cliMd = require('cli-md');

let authTry = 0;


export const loadingSpinner = new Spinner('processing... %s');
loadingSpinner.setSpinnerString('|/-\\');

export const runSandbox = async (route: string) => {
  const path = `${__dirname}/browser-commands/execute-browser.js`;
  if(typeof electronPath === 'object') {
    await routes[route]()
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

export const getClient = async () => {
  let tokens;

  try {
    tokens = JSON.parse(fs.readFileSync(localStorageLocation).toString());
  } catch(e) {}
  if(!(tokens && tokens.token && tokens.clearanceToken)) {
    tokens = await runSandbox('GET_SESSION_TOKEN');
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
    tokens = await runSandbox('GET_SESSION_TOKEN');
    authTry++;
    if(authTry === 3) {
      throw new Error("Authentication error, there is an error integrating with ChatGPT Service");
    }
    return getClient();
  }
  return api;

}

export const useConversation = (conversationApi, rl, answer = "Hello how can i help you?") => {
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

export const resetAuth = async () => {
  if(fs.existsSync(localStorageLocation)) {
    fs.rmSync(localStorageLocation);
  }
  await runSandbox('CLEAN');
  console.log('Cache cleaned!');
}

const getVersion = () => {
  const version = JSON.parse(fs.readFileSync(`${__dirname}/../package.json`).toString()).version;
  console.log(version);
}

export const commands = {
  'open chat': startConversation,
  'start conversation': startConversation,
  'start chat': startConversation,
  'chat': startConversation
};

export const unnecessaryClientCommand = {
  'reset auth': resetAuth,
  'clear session': resetAuth,
  'version': getVersion,
  'clean': resetAuth
};

