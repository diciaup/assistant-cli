const { app, BrowserWindow } = require('electron');

const getSessionToken = async () => {
    const win = new BrowserWindow({width: 799, height: 600});
    win.loadURL('https://chat.openai.com/chat');
    win.webContents.on('did-finish-load', async () => {
        const cookies = await win.webContents.session.cookies.get({});
        try {
            const token = cookies.filter((cookie) => cookie.name === '__Secure-next-auth.session-token')[0].value;
            if(token) {
                process.stdout.write(JSON.stringify({token}));
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
