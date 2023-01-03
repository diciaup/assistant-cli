import {app, BrowserWindow} from "electron";
import {ChatGPTAPI} from "../chatgpt-api";
import { currentUserAgent, setUserAgent } from "./toggle-user-agent";

export const getAccessToken = async (extraHeaders: any) => {
    let headers = '';
    Object.keys(extraHeaders).forEach(hKey => {
        headers += `${hKey}=${extraHeaders[hKey]}`;
    })
    const win = new BrowserWindow({width: 799, height: 600});
    win.loadURL('https://chat.openai.com/api/auth/session', {userAgent: currentUserAgent, extraHeaders: headers});
    return new Promise(resolve => {
        win.webContents.on('did-finish-load', async () => {
            setUserAgent(win.webContents.getUserAgent());
            resolve(await getToken(win));
        });
    })
    
}

const getToken = async (win: BrowserWindow) => {
    const cookies = await win.webContents.session.cookies.get({});
    try {
        let code = `const elements = document.getElementsByTagName('pre');
        if(elements.length > 0) {
            elements.item(0).innerHTML;
        }`;
            const executionResult = await win.webContents.executeJavaScript(code);
            if(executionResult) {
                const parsedExecutionResult = JSON.parse(executionResult);
                const api = await ChatGPTAPI.getInstance({
                    cookies,
                    userAgent: currentUserAgent
                });
                api.accessToken = parsedExecutionResult.accessToken;
                process.stdout.write(parsedExecutionResult.accessToken);
                win.close();
                return parsedExecutionResult.accessToken;
            }
    } catch(e) {
        console.error(e);
    }
}



