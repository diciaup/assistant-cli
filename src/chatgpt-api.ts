import ExpiryMap from 'expiry-map'
import { v4 as uuidv4 } from 'uuid'
import * as types from './types';

import { ChatGPTConversation } from './chatgpt-conversation'
import {Axios, AxiosRequestConfig, AxiosResponse} from "axios";
import {CF_CLEARANCE, SESSION_TOKEN_COOKIE} from "./browser-commands/constants";
import { currentUserAgent } from './browser-commands/toggle-user-agent';
import { resetAuth } from './core';

const KEY_ACCESS_TOKEN = 'accessToken'
const USER_AGENT = currentUserAgent;


interface RefreshAccessTokenResponse {
    type: 'code' | 'page',
    content: any
}

export class ChatGPTAPI {
    protected _sessionToken: string
    protected _clearanceToken: string
    protected _markdown: boolean
    protected _debug: boolean
    protected _apiBaseUrl: string
    protected _backendApiBaseUrl: string
    protected _userAgent: string
    protected _headers: Record<string, string>
    protected _user: types.User | null = null
    protected apiClient: Axios;
    protected backendClient: Axios;
    protected _accessTokenCache: ExpiryMap<string, string>

    constructor(opts: {
        sessionToken: string
        clearanceToken: string
        markdown?: boolean
        apiBaseUrl?: string
        backendApiBaseUrl?: string
        userAgent?: string
        accessTokenTTL?: number
        accessToken?: string
        headers?: Record<string, string>
        debug?: boolean
    }) {
        const {
            sessionToken,
            clearanceToken,
            markdown = true,
            apiBaseUrl = 'https://chat.openai.com/api',
            backendApiBaseUrl = 'https://chat.openai.com/backend-api',
            userAgent = USER_AGENT,
            accessTokenTTL = 60 * 60000, // 1 hour
            accessToken,
            headers,
            debug = false
        } = opts
        this.apiClient = new Axios({baseURL: apiBaseUrl});
        this.backendClient = new Axios({baseURL: backendApiBaseUrl});
        this._sessionToken = sessionToken
        this._clearanceToken = clearanceToken
        this._markdown = !!markdown
        this._debug = !!debug
        this._apiBaseUrl = apiBaseUrl
        this._backendApiBaseUrl = backendApiBaseUrl
        this._userAgent = userAgent
        this._headers = {
            'user-agent': this._userAgent,
            'x-openai-assistant-app-id': '',
            'accept-language': 'en-US,en;q=0.9',
            "Accept-Encoding": "gzip,deflate,compress",
            origin: 'https://chat.openai.com',
            referer: 'https://chat.openai.com/chat',
            'sec-ch-ua':
                '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            ...headers
        }

        this._accessTokenCache = new ExpiryMap<string, string>(accessTokenTTL)
        if (accessToken) {
            this._accessTokenCache.set(KEY_ACCESS_TOKEN, accessToken)
        }

        if (!this._sessionToken) {
            throw new types.ChatGPTError('ChatGPT invalid session token')
        }

        if (!this._clearanceToken) {
            throw new types.ChatGPTError('ChatGPT invalid clearance token')
        }
    }

    get user() {
        return this._user
    }

    get sessionToken() {
        return this._sessionToken
    }

    set accessToken(accessToken: string) {
        this._accessTokenCache.set(KEY_ACCESS_TOKEN, accessToken);
    }

    get clearanceToken() {
        return this._clearanceToken
    }

    get userAgent() {
        return this._userAgent
    }

    async sendMessage(
        message: string,
        opts: types.SendMessageOptions = {}
    ): Promise<string> {
        const {
            conversationId,
            parentMessageId = uuidv4(),
            messageId = uuidv4(),
            action = 'next'
        } = opts


        const accessToken = await this.refreshAccessToken()

        const body: types.ConversationJSONBody = {
            action,
            messages: [
                {
                    id: messageId,
                    role: 'user',
                    content: {
                        content_type: 'text',
                        parts: [message]
                    }
                }
            ],
            model: 'text-davinci-002-render',
            parent_message_id: parentMessageId
        }

        if (conversationId) {
            body.conversation_id = conversationId
        }

        let response = ''
        const headers: any = {
            ...this._headers,
            Authorization: `Bearer ${accessToken.content}`,
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
            Cookie: `cf_clearance=${this._clearanceToken}`
        }
        const res = await this.backendClient.request({
            url: '/conversation',
            method: 'POST',
            headers,
            data: JSON.stringify(body)
        });
        console.log('PARAMETERS', {
            url: '/conversation',
            method: 'POST',
            headers,
            data: JSON.stringify(body)
        });


        try {
            let index = -2;
            let parsedData: types.ConversationResponseEvent;
            const parse = () => {
                try {
                    parsedData = JSON.parse(res.data.split('data: ').slice(index)[0]);
                } catch (e) {
                    if (Math.abs(index) < res.data.length) {
                        index--;
                        parse();
                    }
                }
            }
            parse();
            if(!parsedData) {
                parsedData = JSON.parse(res.data);
            }
            const message = parsedData.message;
            if (message) {
                let text = message?.content?.parts?.[0]
                if (text) {
                    response = text
                }
            }else if((parsedData as any).detail) {
                response = (parsedData as any).detail;
            }else {
               response = 'Empty response';
            }
            return response;
        } catch (err) {
            console.warn('error parsing message', res.data, err);
            const errMessageL = err.toString().toLowerCase()

            if (
                response &&
                (errMessageL === 'error: typeerror: terminated' || errMessageL === 'typeerror: terminated')
            ) {
                return response
            } else {
                return err
            }
        }
    }

    async getIsAuthenticated(): Promise<RefreshAccessTokenResponse> {
        return this.refreshAccessToken();
    }

    async refreshAccessToken(): Promise<RefreshAccessTokenResponse> {
        const cachedAccessToken = this._accessTokenCache.get(KEY_ACCESS_TOKEN)
        if (cachedAccessToken) {
            return {type: 'code', content: cachedAccessToken}
        }

        let response: AxiosResponse;
        try {
            const url = `/auth/session`
            const headers: any = {
                ...this._headers,
                cookie: `${CF_CLEARANCE}=${this._clearanceToken}; ${SESSION_TOKEN_COOKIE}=${this._sessionToken}`,
                accept: '*/*'
            }

            if (this._debug) {
                console.log('GET', url, headers)
            }
            const sessionResParams: AxiosRequestConfig = {
                url,
                method: 'get',
                headers
            }
            const sessionRes = await this.apiClient.request(sessionResParams);
            if(sessionRes.data.startsWith('<')) {
                sessionResParams.url = this.apiClient.defaults.baseURL + sessionResParams.url;
                return {
                    type: 'page',
                    content: sessionResParams
                };
            }
            const res = JSON.parse(sessionRes.data);
            const accessToken = res?.accessToken
            if (!accessToken) {
                throw new types.ChatGPTError('Unauthorized');
            }

            const appError = res?.error
            if (appError) {
                if (appError === 'RefreshAccessTokenError') {
                    await resetAuth();
                    return this.refreshAccessToken();
                } else {
                    throw new types.ChatGPTError(appError)
                }
            }

            if (res.user) {
                this._user = res.user
            }

            this._accessTokenCache.set(KEY_ACCESS_TOKEN, accessToken)
            return {type: 'code', content: accessToken}
        } catch (err: any) {
            console.log(err);
            if (this._debug) {
                console.error(err)
            }
            console.log(err);
            throw new types.ChatGPTError(
                `ChatGPT failed to refresh auth token. ${err.toString()}`
            )
        }
    }

    async getConversations(result = [], offset: number = 0): Promise<{id: string, title: string}[]> {
        const accessToken = await this.refreshAccessToken();
        const headers: any = {
            ...this._headers,
            Authorization: `Bearer ${accessToken.content}`,
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
            Cookie: `cf_clearance=${this._clearanceToken}`
        }
        const url = `/conversations`;
        const conversationsParams: AxiosRequestConfig = {
            url,
            method: 'get',
            params: {
                offset,
                limit: 50
            },
            headers
        }
        const sessions = JSON.parse((await this.backendClient.request(conversationsParams)).data).items;
        result.push(...(sessions ?? []));
        return result;
    }

    async changeConversationName(id: string, title: string) {
        const accessToken = await this.refreshAccessToken();
        const headers: any = {
            ...this._headers,
            Authorization: `Bearer ${accessToken.content}`,
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
            Cookie: `cf_clearance=${this._clearanceToken}`
        }
        const url = `/conversation/${id}`;
        const conversationsParams: AxiosRequestConfig = {
            url,
            method: 'patch',
            headers,
            data: JSON.stringify({title})
        }
        return this.backendClient.request(conversationsParams);
    }

    getConversation(
        opts: { conversationId?: string; parentMessageId?: string } = {}
    ) {
        return new ChatGPTConversation(this, opts)
    }
}


