import { clean } from "./clean";
import { sendMessage } from "./send-message";
const cliMd = require('cli-md');
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { getConversations } from "./show-conversations";

interface Route {
    request: (...args: any[]) => Promise<any>;
    response: (response: any) => Promise<void>;
}

const routes: {[key: string]: Route} = {
    CLEAN: {
        request: clean,
        response: async () => {}
    },
    SEND_MESSAGE: {
        request: sendMessage,
        response: async (response: any) => {
            console.clear();
            console.log(cliMd(NodeHtmlMarkdown.translate(response || '')));
            return response;
        }
    },
    GET_CONVERSATIONS: {
        request: getConversations,
        response: async (response: any) => {
            console.log(response);
            return response;
        }
    }
};

export default routes;