import {app, BrowserWindow} from "electron";
import {ChatGPTAPI} from "../chatgpt-api";
import {CF_CLEARANCE, SESSION_TOKEN_COOKIE} from "./constants";
import { currentUserAgent } from "./toggle-user-agent";

export const getAccessToken = async (extraHeaders: any) => {
    let headers = '';
    Object.keys(extraHeaders).forEach(hKey => {
        headers += `${hKey}=${extraHeaders[hKey]}`;
    })
    const win = new BrowserWindow({width: 799, height: 600});
    win.loadURL('https://chat.openai.com/chat', {userAgent: currentUserAgent, extraHeaders: headers});
    win.webContents.on('did-finish-load', () => {
        let code = `document.querySelector('meta[content="ChatGPT"]')`;
        win.webContents.executeJavaScript(code).then(executionResult => {
            if(executionResult) {
                getToken(win);
            }
        });
    });
}

const getToken = async (win: BrowserWindow) => {
    const cookies = await win.webContents.session.cookies.get({});
    try {
        const token = cookies.filter((cookie) => cookie.name === SESSION_TOKEN_COOKIE)[0].value;
        const clearanceToken = cookies.filter((cookie) => cookie.name === CF_CLEARANCE)[0].value;
        let code = `const elements = document.getElementsByTagName('pre');
        if(elements.length > 0) {
            elements.item(0).innerHTML;
        }`;
            const executionResult = await win.webContents.executeJavaScript(code);
            if(executionResult) {
                try {
                    const parsedExecutionResult = JSON.parse(executionResult);
                    const api = new ChatGPTAPI({
                        sessionToken: token,
                        clearanceToken,
                        userAgent: currentUserAgent
                    });
                    api.accessToken = parsedExecutionResult.accessToken;
                    process.stdout.write(parsedExecutionResult.accessToken);
                }catch(e) {}
            }
    }catch(e) {

    }finally {
        app.exit();
    }

}



