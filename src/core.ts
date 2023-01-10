import { localStorageLocation } from "./browser-commands/constants";
import routes from "./browser-commands/routes";

const Spinner = require('cli-spinner').Spinner;
import {spawn} from 'child_process';
const electronPath = require("electron");
const fs = require('fs');
const readline = require('readline');
const cliMd = require('cli-md');


let authTry = 0;

export const loadingSpinner = new Spinner('processing... %s');

export const runSandbox = async (route: string, ...args: any[]): Promise<any> => {
  const path = `${__dirname}/browser-commands/execute-browser.js`;
  if(typeof electronPath === 'object') {
    return routes[route].response(await routes[route].request(args));
  }else {
    return new Promise((resolve) => {
      const opResult = spawn(electronPath, ['--no-logging', path, args.join(' ')], { env: {...process.env, ...{ROUTE: route, ELECTRON_ENABLE_LOGGING: '0' }}});
      opResult.stdout.on('data', (data) => {
        try {
          const returnedValue = JSON.parse(data.toString()).return;
          if(returnedValue === 'done') {
            resolve(returnedValue);
            return;
          }
          routes[route].response(returnedValue);
        }catch(e) {
          if(process.env.ENV === 'dev') {
            console.error(e, 'error:', data.toString());
          }
        }
      })
    })   
  }

}

export const useConversation = (rl, answer = "Hello how can i help you?") => {
  rl.question(`${cliMd('🤖 ' + answer)}> `, (request) => {
    if(request.length > 0) {
       loadingSpinner.start();
       runSandbox('SEND_MESSAGE', request).then(res => {
        useConversation(rl, res);
      })
      .catch(e => useConversation(rl, e))
      .finally(() => loadingSpinner.stop(true));
    }else {
      useConversation(rl, 'Please write a message');
    }
  })
};

const startConversation = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  useConversation(rl);
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

