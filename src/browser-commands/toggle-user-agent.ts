import { ALTERNATIVE_USER_AGENT, USER_AGENT } from "./constants";

export let currentUserAgent = USER_AGENT;

export const toggleUserAgent = () => {
  if(currentUserAgent === ALTERNATIVE_USER_AGENT) {
    currentUserAgent = USER_AGENT;
  }else {
    currentUserAgent = ALTERNATIVE_USER_AGENT;
  }
}

