import { ALTERNATIVE_USER_AGENT, USER_AGENT } from "./constants";

export let currentUserAgent = USER_AGENT;


export const setUserAgent = (userAgent: string) => {
  currentUserAgent = userAgent;
}

