import { execSync } from "child_process";
import { clean } from "./clean";
import { getAccessToken } from "./get-access-token";
import { getSessionToken } from "./get-session-token";
import { localStorageLocation } from "./constants";
import { getCookies } from "./get-cookies";
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
    GET_ACCESS_TOKEN: {
        request: getAccessToken,
        response: async (response) => {
            return response[0];
        }
    },
    GET_SESSION_TOKEN: {
        request: getSessionToken,
        response: async (response) => {
            if(response.length > 1) {
                try {
                    const token = JSON.parse(response[1]);
                    if(token) {
                        fs.writeFileSync(localStorageLocation, JSON.stringify(token));
                        return token;
                    }
                } catch(e) {
                    console.log('original message', response.toString());
                    throw e;
                }
            }

        }
    },
    GET_COOKIES: {
        request: getCookies,
        response: async (response) => {
            if(response.length > 1) {
                try {
                    const token = JSON.parse(response[1]);
                    if(token) {
                        return token;
                    }
                } catch(e) {
                    console.log('original message', response.toString());
                    throw e;
                }
            }

        }
    }
};

export default routes;