import { BrowserWindow } from "electron";
import { currentUserAgent } from "./toggle-user-agent";

export const clean = async () => {
    const win = new BrowserWindow({width: 799, height: 600});
    win.loadURL('https://chat.openai.com/chat', {userAgent: currentUserAgent});
    return new Promise((resolve, reject) => {
        win.webContents.on('did-finish-load', () => {
            let code = `!!document.querySelector('meta[content="ChatGPT"]');`;
            win.webContents.executeJavaScript(code).then(async (executionResult) => {
                if(executionResult) {
                    try{
                        await win.webContents.session.clearCache();
                        await win.webContents.session.clearStorageData({origin: 'https://chat.openai.com'});
                        await win.webContents.session.clearAuthCache();
                        resolve(executionResult);
                    }catch(e) {
                        reject(e);
                    }finally {
                        win.close();
                    }
                }
            });
        });
    });

}
