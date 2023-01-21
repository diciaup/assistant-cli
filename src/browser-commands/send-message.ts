import { CHAT_GPT_DOMAIN } from "./constants";
import {BrowserWindow} from 'electron';

export const sendMessage = async (message: string[]): Promise<string> => {
    const win = new BrowserWindow({width: 799, height: 600, show: true});
    win.loadURL(CHAT_GPT_DOMAIN);
    return new Promise((resolve) => {
        win.webContents.on('did-finish-load', async () => {
            console.log('finish load');
            let code = `(!!document.querySelector('meta[content="ChatGPT"]') && !!document.getElementsByTagName("textarea").item(0) && !!document.getElementsByTagName("nav").item(0));`;
            const executionResult = await win.webContents.executeJavaScript(code);
            if(executionResult) {
                if(process.env.ENV !== 'dev') {
                    win.hide();
                }
                resolve(await handleMainPage(win, message.join(' ')));
            }
        });
    })
};

const selectNextConversation = async (win: BrowserWindow, index = 0) => {
    console.log('selecting ', index);
    return new Promise(async (resolve) => {
        win.webContents.debugger.on('message', async (event, method, params) => {
            console.log(event, method, params);
            if (method === 'Network.responseReceived') { 
                const {response} = params;
                const {url} = response;
                if (url.indexOf("/conversation") > -1 && !url.endsWith('conversation')) {
                    resolve(null);
                }
            }
        });
        const code = `document.getElementsByTagName('nav').item(0).getElementsByClassName("flex-col").item(0).childNodes.item(0).getElementsByTagName("a").item(${index}).click()`;
        await win.webContents.executeJavaScript(code);
    });
}

const findConversation = async (win: BrowserWindow) => {
    let index = 0;
    let executionResult = true;
    const navItems = await new Promise(resolve => setInterval(async () => {
        const code = `document.getElementsByTagName('nav').item(0).getElementsByClassName("flex-col").item(1).childElementCount`;
        const length = await win.webContents.executeJavaScript(code);
        if (!!length) {
            resolve(length);
        }
    }, 1000));
    if(navItems > 1) {
        while(executionResult) {
            await selectNextConversation(win, index);
            let code = `(!!document.querySelector('meta[content="ChatGPT"]') && !!document.getElementsByTagName("textarea").item(0) && !!document.getElementsByTagName("nav").item(0));`;
            executionResult = !(await win.webContents.executeJavaScript(code));
            console.log('check index', index, executionResult);
            index++;
        }
    }
}



const handleMainPage = async (win: BrowserWindow, message: string): Promise<string> => {
    win.webContents.debugger.attach('1.3');
    let requestId;
    return new Promise(async (resolve) => {
        win.webContents.debugger.on('message', async (event, method, params) => {
            if (method === 'Network.responseReceived') { 
                const { response } = params;
                const {url} = response;
                if (response.mimeType === 'text/event-stream' && url.endsWith("/conversation")) {
                    requestId = params.requestId;
                }
            }
            if (requestId && params.requestId === requestId && method === 'Network.dataReceived') {
                try {
                    const currentMessageContent = await win.webContents.executeJavaScript(`
                        document.getElementsByClassName('markdown').item(document.getElementsByClassName('markdown').length - 1).innerHTML;
                    `);
                    process.stdout.write(JSON.stringify({return: currentMessageContent}));
                }catch(e) {
                    console.error(e);
                }
            }
            if(requestId && params.requestId === requestId && (method === 'Network.loadingFinished' || method === 'Network.loadingFailed')) {
                process.stdout.write(JSON.stringify({return: 'done'}))
                resolve('done');
                win.close();
            }
        })
        win.webContents.debugger.sendCommand('Network.enable');
        await findConversation(win);
        win.webContents.executeJavaScript(`
            document.getElementsByTagName("textarea").item(0).value = "${message}";
            document.getElementsByTagName("textarea").item(0).nextElementSibling.click();
        `);
    });
}