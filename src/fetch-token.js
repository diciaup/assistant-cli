const { app, BrowserWindow } = require('electron');

const getSessionToken = async () => {
    const win = new BrowserWindow({width: 799, height: 600});
    win.loadURL('https://chat.openai.com/chat', {userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'});
    if(process.env.CLEAR_CACHE === 'true') {
        await win.webContents.session.clearCache();
        await win.webContents.session.clearStorageData({origin: 'https://chat.openai.com'});
        await win.webContents.session.clearAuthCache();
        win.close();
        app.exit();
    }
    win.webContents.on('did-finish-load', async () => {
        const cookies = await win.webContents.session.cookies.get({});
        try {
            const token = cookies.filter((cookie) => cookie.name === '__Secure-next-auth.session-token')[0].value;
            const clearanceToken = cookies.filter((cookie) => cookie.name === 'cf_clearance')[0].value;
            if(token) {
                process.stdout.write(JSON.stringify({token, clearanceToken}));
                if(process.env.ENV !== 'dev') {
                    win.close();
                    app.exit();
                }
            }
        } catch(e) {
            console.error(e);
        }
    });
}
app.on('ready', getSessionToken);
