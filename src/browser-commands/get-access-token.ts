import {app, BrowserWindow} from "electron";

export const getAccessToken = async () => {
    const win = new BrowserWindow({width: 799, height: 600});
    win.loadURL('https://chat.openai.com/chat', {userAgent: 'Chrome'});
    if(process.env.CLEAR_CACHE === 'true') {
        await win.webContents.session.clearCache();
        await win.webContents.session.clearStorageData({origin: 'https://chat.openai.com'});
        await win.webContents.session.clearAuthCache();
        win.close();
    }
}



