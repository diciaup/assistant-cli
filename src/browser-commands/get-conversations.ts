import { BrowserWindow } from "electron";

export const conversationLoaded = async (win: BrowserWindow): Promise<boolean> => {
    return new Promise((resolve) => {
        win.webContents.on('did-finish-load', async () => {
            let code = `(!!document.querySelector('meta[content="ChatGPT"]') && !!document.getElementsByTagName("textarea").item(0));`;
            const executionResult = await win.webContents.executeJavaScript(code);
            if(executionResult) {
                win.webContents.debugger.attach('1.3');
                let requestId;
                return new Promise((resolve) => {
                    win.webContents.debugger.on('message', async (event, method, params) => {
                        if (method === 'Network.responseReceived') { 
                            const { response } = params;
                            const {url} = response;
                            if (url.indexOf("/conversations") > -1) {
                                requestId = params.requestId;
                                win.close();
                            }
                        }
                        if(requestId === params.requestId && (method === 'Network.loadingFinished' || method === 'Network.loadingFailed')) {
                            resolve(true);
                        }
                    })
                    win.webContents.debugger.sendCommand('Network.enable');
                });
            }
        });
    })
};