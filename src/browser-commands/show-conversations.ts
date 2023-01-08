import { BrowserWindow } from "electron";
import { CHAT_GPT_DOMAIN } from "./constants";

export const getConversations = async (): Promise<any[]> => {
    const win = new BrowserWindow({width: 799, height: 600, show: true});
    win.loadURL(CHAT_GPT_DOMAIN);
    return new Promise((resolve) => {
        win.webContents.on('did-finish-load', async () => {
            let code = `(!!document.querySelector('meta[content="ChatGPT"]') && !!document.getElementsByTagName("textarea").item(0));`;
            const executionResult = await win.webContents.executeJavaScript(code);
            if(executionResult) {
                win.webContents.debugger.attach('1.3');
                let requestId;
                return new Promise((resolve) => {
                    win.webContents.debugger.on('message', async (event, method, params) => {
                        console.log(method, params.response?.url);
                        if (method === 'Network.responseReceived') { 
                            const { response } = params;
                            const {url} = response;
                            if (url.indexOf("/conversations") > -1) {
                                requestId = params.requestId;
                                win.close();
                            }
                        }
                        if(requestId === params.requestId && method === 'Network.loadingFinished') {
                            console.log(requestId);
                            resolve(await win.webContents.debugger.sendCommand('Network.getResponseBody', {requestId}))
                        }
                    })
                    win.webContents.debugger.sendCommand('Network.enable');
                });
            }
        });
    })
};