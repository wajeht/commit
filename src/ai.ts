import { OpenAI } from 'openai';
import { appConfig } from './config';
import { getRandomElement } from './util';
import Anthropic from '@anthropic-ai/sdk';
import { AIService, Provider } from './types';
import { UnauthorizedError, ValidationError } from './error';

/**
 * Reference
 *
 * https://github.com/Nutlope/aicommits/blob/develop/src/utils/prompt.ts
 *
 */
export const prompt = `Generate a concise git commit message written in present tense for the following code diff with the given specifications:
1. Message language: English.
2. Commit message must be a maximum of 72 characters.
3. Exclude anything unnecessary such as translation. Your entire response will be passed directly into git commit.
4. The commit message will always need to have a type followed by the commit message.
5. The output response must be in the format:

<type>: <commit message>

Choose a type from the type-to-description JSON below that best describes the git diff:
{
  "docs": "Documentation only changes",
  "style": "Changes that do not affect the meaning of the code",
  "refactor": "A code change that neither fixes a bug nor adds a feature",
  "perf": "A code change that improves performance",
  "test": "Adding missing tests or correcting existing tests",
  "build": "Changes that affect the build system or external dependencies",
  "ci": "Changes to our CI configuration files and scripts",
  "chore": "Other changes that don't modify src or test files",
  "revert": "Reverts a previous commit",
  "feat": "A new feature",
  "fix": "A bug fix"
}`;

export const openAI: AIService = {
	generate: async (diff: string, apiKey?: string) => {
		try {
			const API_KEY = apiKey ? apiKey : appConfig.OPENAI_API_KEY;
			const chatCompletion = await new OpenAI({ apiKey: API_KEY }).chat.completions.create({
				model: 'gpt-3.5-turbo',
				temperature: 0.7,
				top_p: 1,
				frequency_penalty: 0,
				presence_penalty: 0,
				max_tokens: 200,
				stream: false,
				messages: [
					{
						role: 'system',
						content: prompt,
					},
					{
						role: 'user',
						content: diff,
					},
				],
			});
			const messages = chatCompletion.choices
				.filter((choice) => choice.message?.content)
				.map((choice) => choice.message.content);
			return getRandomElement(messages);
		} catch (error: any) {
			if (error.code === 'context_length_exceeded') {
				throw new ValidationError('The provided input exceeds the maximum allowed token length.');
			}

			if (error?.error?.code === 'invalid_api_key') {
				throw new UnauthorizedError(error.message);
			}

			throw error;
		}
	},
};

export const claudeAI: AIService = {
	generate: async (diff: string, apiKey?: string) => {
		try {
			const API_KEY = apiKey ? apiKey : appConfig.CLAUDE_API_KEY;
			const messages = await new Anthropic({ apiKey: API_KEY }).messages.create({
				temperature: 0.7,
				max_tokens: 1024,
				model: 'claude-2.1',
				stream: false,
				messages: [
					{
						role: 'user',
						content: prompt + diff,
					},
				],
			});
			// @ts-ignore - trust me bro
			return getRandomElement(messages.content).text;
		} catch (error: any) {
			if (error?.error?.error?.type === 'authentication_error') {
				throw new UnauthorizedError(error.error.error.message);
			}
			throw error;
		}
	},
};

export function ai(type?: Provider): AIService {
	switch (type) {
		case 'claudeai':
			return claudeAI;
		case 'openai':
		default:
			return openAI;
	}
}
