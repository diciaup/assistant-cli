import { currentUserAgent } from "../app";
import BrowserWindow = Electron.BrowserWindow;

export const clean = async () => {
    const win = new BrowserWindow({width: 799, height: 600});
    win.loadURL('https://chat.openai.com/chat', {userAgent: currentUserAgent});
    win.webContents.on('did-finish-load', async () => {
        await win.webContents.session.clearCache();
        await win.webContents.session.clearStorageData({origin: 'https://chat.openai.com'});
        await win.webContents.session.clearAuthCache();
        win.close();
    });
}
