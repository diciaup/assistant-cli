import {ChatGPTAPI} from "./chatgpt-api";

const { app, BrowserWindow } = require('electron');

const getSessionToken = async () => {
    const win = new BrowserWindow({width: 799, height: 600});
    win.loadURL('https://chat.openai.com/chat', {userAgent: 'Chrome'});
    if(process.env.CLEAR_CACHE === 'true') {
        await win.webContents.session.clearCache();
        await win.webContents.session.clearStorageData({origin: 'https://chat.openai.com'});
        await win.webContents.session.clearAuthCache();
        win.close();
    }
    win.webContents.on('did-finish-load', () => {
        checkTokens(win);
    });
}

const checkTokens = async (win) => {
    const cookies = await win.webContents.session.cookies.get({});
    try {
        const token = cookies.filter((cookie) => cookie.name === '__Secure-next-auth.session-token')[0].value;
        const clearanceToken = cookies.filter((cookie) => cookie.name === 'cf_clearance')[0].value;
        const api = new ChatGPTAPI({
            sessionToken: token,
            clearanceToken,
            userAgent: 'Chrome'
        });
        const authenticated = await api.getIsAuthenticated();
        if(authenticated) {
            process.stdout.write('data: ' + JSON.stringify({token, clearanceToken}));
            win.close();
        }else {
            await checkTokens(win);
        }
    } catch(e) {
        console.error('error during check tokens', e);
    }
}

app.on('ready', getSessionToken);

app.on('window-all-closed', () => {
  app.quit()
})
