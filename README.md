# Assistant CLI <!-- omit in toc -->

> CLI tool for [ChatGPT](https://openai.com/blog/chatgpt/) Service.

![NPM](https://img.shields.io/npm/v/assistant-cli.svg) ![MIT License](https://img.shields.io/badge/license-MIT-blue)

- [Intro](#intro)
- [Install](#install)
- [Usage](#usage)

## Intro

This is a Command line tools that permits people to integrate easily with the [ChatGPT](https://openai.com/blog/chatgpt) by [OpenAI](https://openai.com). The authentication is dynamically managed by the cli ✨

## Install

```bash
npm install -g assistant-cli
```

## Usage

> **Note**
> Per the official OpenAI Discord on December 7th, 2022: The ChatGPT servers are currently experiencing "exceptionally high demand," so some requests may respond with [HTTP 503 errors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/503).

### One spot question:
```bash
assistant Provide me a React snippet
```

### Continuous conversation feature

You can open a chat typing:
```bash
assistant chat
```
<p align="center">
  <img src="/media/assistant-chat.png" />
</p>

