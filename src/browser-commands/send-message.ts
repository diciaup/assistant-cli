import { CHAT_GPT_DOMAIN } from "./constants";
import {BrowserWindow} from 'electron';
import * as types from '../types';

export const sendMessage = async (message: string): Promise<string> => {
    const win = new BrowserWindow({width: 799, height: 600, show: false});
    win.loadURL(CHAT_GPT_DOMAIN);
    return new Promise((resolve) => {
        win.webContents.on('did-finish-load', async () => {
            let code = `!!(document.querySelector('meta[content="ChatGPT"]'));`;
            const executionResult = await win.webContents.executeJavaScript(code);
            if(executionResult) {
                resolve(await handleMainPage(win, message));
            }
        });
    })
   
};

const handleMainPage = (win: BrowserWindow, message: string): Promise<string> => {
    win.webContents.debugger.attach('1.3');
    let requestId;
    return new Promise((resolve) => {
        win.webContents.debugger.on('message', async (event, method, params) => {
            if (method === 'Network.responseReceived') { 
                const { response } = params;
                const {url} = response;
                if (response.mimeType === 'text/event-stream' && url.endsWith("/conversation")) {
                    requestId = params.requestId;
                }
            }
            if(requestId && params.requestId === requestId && (method === 'Network.loadingFinished' || method === 'Network.loadingFailed')) {
                let response;
                try {
                    let responseContent = await win.webContents.debugger.sendCommand('Network.getResponseBody', { requestId });
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
                } catch(e) {
                    response = await win.webContents.executeJavaScript(`
                        const markdownList = document.getElementsByClassName('markdown');
                        markdownList.item(markdownList.length - 1).innerHTML;
                    `);
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