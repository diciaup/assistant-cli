import {ChatGPTAPI} from "../chatgpt-api";
import {AxiosRequestConfig, AxiosResponse} from "axios";
import {app, BrowserWindow} from 'electron';


export const getSessionToken = async () => {
    const win = new BrowserWindow({width: 799, height: 600});
    win.loadURL('https://chat.openai.com/chat', {userAgent: 'Chrome'});
    win.webContents.on('did-finish-load', () => {
        checkTokens(win);
    });
}

const checkTokens = async (win: BrowserWindow) => {
    const cookies = await win.webContents.session.cookies.get({});
    let code = `const elements = document.getElementsByTagName('pre');
    if(elements.length > 0) {
        elements.item(0).innerHTML;
    }`;
    const executionResult = await win.webContents.executeJavaScript(code);
    try {
        const token = cookies.filter((cookie) => cookie.name === '__Secure-next-auth.session-token')[0].value;
        const clearanceToken = cookies.filter((cookie) => cookie.name === 'cf_clearance')[0].value;
        const api = new ChatGPTAPI({
            sessionToken: token,
            clearanceToken,
            userAgent: 'Chrome'
        });
        if(executionResult) {
            try {
                const parsedExecutionResult = JSON.parse(executionResult);
                api.accessToken = parsedExecutionResult.accessToken;
            }catch(e) {}
        }

        const authenticated = await api.getIsAuthenticated();
        if(authenticated.type === 'code') {
            process.stdout.write('data: ' + JSON.stringify({token, clearanceToken}));
            win.close();
        }
        if(authenticated.type === 'page') {
            const request = authenticated.content as AxiosRequestConfig;
            let extraHeaders = '';
            Object.keys(request.headers).forEach(hKey => {
                extraHeaders += `${hKey}=${request.headers[hKey]}`;
            })
            await win.loadURL(request.url, {userAgent: 'Chrome', extraHeaders});
        }
    } catch(e) {
        console.error('error during check tokens', e);
    }
}

app.on('ready', getSessionToken);

app.on('window-all-closed', () => {
  app.quit()
})
