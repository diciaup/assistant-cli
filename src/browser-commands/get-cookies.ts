import {ChatGPTAPI} from "../chatgpt-api";
import {BrowserWindow, Cookie} from 'electron';
import { CHAT_GPT_DOMAIN } from "./constants";

export interface SecurityInfo {
    cookies: Cookie[],
    accessToken: string,
    
}

export const getCookies = async (): Promise<SecurityInfo> => {
    const win = new BrowserWindow({width: 799, height: 600, webPreferences: {webSecurity: false}});
    win.loadURL(CHAT_GPT_DOMAIN);
    win.webContents.debugger.attach('1.3');
    return new Promise((resolve) => {
        win.webContents.debugger.on('message', async (event, method, params) => {
            if (method === 'Network.responseReceived') { 
                const url = params.response.url; 
                const response = await win.webContents.debugger.sendCommand('Network.getResponseBody', { requestId: params.requestId });
                if(url.indexOf('/session') > -1) {
                    const securityInfo: SecurityInfo = {
                        accessToken: JSON.parse(response.body).accessToken,
                        cookies: await win.webContents.session.cookies.get({})
                    }
                    resolve(securityInfo);
                    process.stdout.write(JSON.stringify({return: securityInfo}));
                    win.close();
                }
            }
        })
        win.webContents.debugger.sendCommand('Network.enable'); 
    });
}