import BrowserWindow = Electron.BrowserWindow;
import {app} from "electron";

export const clean = async (win: BrowserWindow) => {
    await win.webContents.session.clearCache();
    await win.webContents.session.clearStorageData({origin: 'https://chat.openai.com'});
    await win.webContents.session.clearAuthCache();
    win.close();
}
