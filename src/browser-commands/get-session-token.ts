import {ChatGPTAPI} from "../chatgpt-api";
import {AxiosRequestConfig} from "axios";
import {app, BrowserWindow} from 'electron';
import {CF_CLEARANCE, CHAT_GPT_DOMAIN, SESSION_TOKEN_COOKIE} from "./constants";
import {getAccessToken} from "./get-access-token";
import { currentUserAgent } from "./toggle-user-agent";


export const getSessionToken = async () => {
    const win = new BrowserWindow({width: 799, height: 600});
    win.loadURL(CHAT_GPT_DOMAIN, {userAgent: currentUserAgent});
    win.webContents.on('did-finish-load', () => {
        let code = `!!(document.querySelector('meta[content="ChatGPT"]'));`;
        win.webContents.executeJavaScript(code).then(executionResult => {
            if(executionResult) {
                checkTokens(win);
            }
        }).catch(e => console.error('custom error', e));
    });
}

const checkTokens = async (win: BrowserWindow) => {
    const cookies = await win.webContents.session.cookies.get({});
    try {
        const token = cookies.filter((cookie) => cookie.name === SESSION_TOKEN_COOKIE)[0].value;
        const clearanceToken = cookies.filter((cookie) => cookie.name === CF_CLEARANCE)[0].value;
        const api = new ChatGPTAPI({
            sessionToken: token,
            clearanceToken,
            userAgent: currentUserAgent
        });

        const authenticated = await api.getIsAuthenticated();
        if(authenticated.type === 'code') {
            process.stdout.write('data: ' + JSON.stringify({token, clearanceToken}));
            win.close();
        }
        if(authenticated.type === 'page') {
            const request = authenticated.content as AxiosRequestConfig;
            await getAccessToken(request);
        }
        app.exit();
    } catch(e) {
        console.error('error during check tokens', e);
    }
}
