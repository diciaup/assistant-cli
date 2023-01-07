import { commands, loadingSpinner, runSandbox, unnecessaryClientCommand } from './core';
const cliMd = require('cli-md');


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
  const def = commands[args.join(' ')];
  if(def) {
    def();
  }else {
    loadingSpinner.start();
    let response = await runSandbox('SEND_MESSAGE', args);
    loadingSpinner.stop(true);
    console.log(cliMd(response || ''));
  }
})().catch((err) => console.log(err));
