import * as types from './types'
import { type ChatGPTAPI } from './chatgpt-api'

export class ChatGPTConversation {
    api: ChatGPTAPI
    conversationId: string | undefined = undefined
    parentMessageId: string | undefined = undefined

    constructor(
        api: ChatGPTAPI,
        opts: { conversationId?: string; parentMessageId?: string } = {}
    ) {
        this.api = api
        this.conversationId = opts.conversationId
        this.parentMessageId = opts.parentMessageId
    }

    async sendMessage(
        message: string,
        opts: types.SendConversationMessageOptions = {}
    ): Promise<string> {
        const { onConversationResponse, ...rest } = opts
        const allConversations = await this.api.getConversations();
        const conversations = allConversations.filter(item => item.title === 'CLI');
        if(conversations.length === 0) {
            if(allConversations.length > 0) {
                await this.api.changeConversationName(allConversations[0].id, 'CLI');
            }
        }
        let conversationId = conversations.length > 0 ? conversations[0].id : undefined;
        return this.api.sendMessage(message, {
            ...rest,
            conversationId,
            parentMessageId: this.parentMessageId,
            onConversationResponse: (response: any) => {
                if(response.detail && onConversationResponse) {
                    return onConversationResponse(response);
                }
                if (response.conversation_id) {
                    this.conversationId = response.conversation_id
                }

                if (response.message?.id) {
                    this.parentMessageId = response.message.id
                }

                if (onConversationResponse) {
                    return onConversationResponse(response)
                }
            }
        })
    }
}
