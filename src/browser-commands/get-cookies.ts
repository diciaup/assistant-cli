import {ChatGPTAPI} from "../chatgpt-api";
import {app, BrowserWindow} from 'electron';
import { CHAT_GPT_DOMAIN } from "./constants";
import {getAccessToken} from "./get-access-token";
import { currentUserAgent, setUserAgent } from "./toggle-user-agent";

export const getCookies = async () => {
    const win = new BrowserWindow({width: 799, height: 600});
    win.loadURL(CHAT_GPT_DOMAIN);
    win.webContents.on('did-finish-load', () => {
        setUserAgent(win.webContents.getUserAgent());
        let code = `!!(document.querySelector('meta[content="ChatGPT"]'));`;
        win.webContents.executeJavaScript(code).then(executionResult => {
            if(executionResult) {
                extractCookies(win);
            }
        }).catch(e => console.error('custom error', e));
    });
}

const extractCookies = async (win: BrowserWindow) => {
    const cookies = await win.webContents.session.cookies.get({});
    try {
        const api = await ChatGPTAPI.getInstance({
            cookies, 
            userAgent: currentUserAgent
        });

        const authenticated = await api.getIsAuthenticated();
        if(authenticated.type === 'code') {
            process.stdout.write('data: ' + JSON.stringify(cookies));
            win.close();
        }else {
            getAccessToken(authenticated.content.headers);
        }
        app.exit();
    } catch(e) {
        console.error('error during check tokens', e);
    }
}
