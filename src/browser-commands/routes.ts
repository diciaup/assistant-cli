import { clean } from "./clean";
import { sendMessage } from "./send-message";

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
            return response;
        }
    }
};

export default routes;