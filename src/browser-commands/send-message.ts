import { CHAT_GPT_DOMAIN } from "./constants";
import {BrowserWindow} from 'electron';
import * as types from '../types';

export const sendMessage = async (message: string): Promise<string> => {
    const win = new BrowserWindow({width: 799, height: 600});
    win.loadURL(CHAT_GPT_DOMAIN);
    return new Promise((resolve) => {
        win.webContents.on('did-finish-load', () => {
            let code = `!!(document.querySelector('meta[content="ChatGPT"]'));`;
            win.webContents.executeJavaScript(code).then(executionResult => {
                if(executionResult) {
                    resolve(handleMainPage(win, message));
                }
            }).catch(e => console.error('custom error', e));
        });
    })
   
};

const handleMainPage = (win: BrowserWindow, message: string): Promise<string> => {
    win.webContents.debugger.attach('1.3');
    let requestId;
    return new Promise((resolve) => {
        win.webContents.debugger.on('message', async (event, method, params) => {
            console.log('response', params);
            if (method === 'Network.responseReceived') { 
                const { response } = params;
                const {url} = response;
                if (response.mimeType === 'text/event-stream' && url.endsWith("/conversation")) {
                    requestId = params.requestId;
                }
            }
            console.log(requestId, params.requestId, method);
            if(params.requestId === requestId && method === 'Network.loadingFinished') {
                const responseContent: any = await new Promise(async (res) => {
                    const interval = setInterval(async () => {
                        console.log('interval');
                        try {
                            res(await win.webContents.debugger.sendCommand('Network.getResponseBody', { requestId: params.requestId }));
                            clearInterval(interval);
                        } catch(e) {
                            console.error(e);
                        }
                    }, 1000)
                })
                const res = responseContent.body;
                let index = -2;
                let parsedData: types.ConversationResponseEvent;
                const parse = () => {
                    try {
                        parsedData = JSON.parse(res.split('data: ').slice(index)[0]);
                    } catch (e) {
                        if (Math.abs(index) < res.length) {
                            index--;
                            parse();
                        }
                    }
                }
                parse();
                if(!parsedData) {
                    parsedData = JSON.parse(res);
                }
                const message = parsedData.message;
                let response;
                if (message) {
                    let text = message?.content?.parts?.[0]
                    if (text) {
                        response = text
                    }
                }else if((parsedData as any).detail) {
                    response = (parsedData as any).detail;
                }else {
                    response = 'Empty response';
                }
                process.stdout.write(JSON.stringify({return: response}))
                resolve(response);
                win.close();
            }
        })
        win.webContents.debugger.sendCommand('Network.enable'); 
        win.webContents.executeJavaScript(`
            document.getElementsByTagName("textarea").item(0).value = "${message}";
            document.getElementsByTagName("textarea").item(0).nextElementSibling.click();
        `);
    });
}