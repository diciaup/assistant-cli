import { execSync } from "child_process";
import { clean } from "./clean";
import { getAccessToken } from "./get-access-token";
import { getSessionToken } from "./get-session-token";
import { localStorageLocation } from "./constants";
import { SecurityInfo, getCookies } from "./get-cookies";
import { ChatGPTAPI } from "../chatgpt-api";
const fs = require('fs');

interface Route {
    request: (...args: any[]) => Promise<any>;
    response: (response: any) => Promise<void>;
}

const routes: {[key: string]: Route} = {
    CLEAN: {
        request: clean,
        response: async () => {}
    },
    GET_COOKIES: {
        request: getCookies,
        response: async (response: SecurityInfo) => {
            await ChatGPTAPI.getInstance({
                cookies: response.cookies,
                accessToken: response.accessToken
            });
        }
    }
};

export default routes;