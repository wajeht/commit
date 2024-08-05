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
export const prompt = `Generate a concise git commit message for the following code diff with these specifications:

1. Message language: English
2. Maximum length: 72 characters (including type and scope)
3. Format: <type>(<scope>): <subject>
   - <scope> is optional
   - Use ! after type/scope for breaking changes: <type>(<scope>)!: <subject>
4. Use present tense and imperative mood (e.g., "Add feature" not "Added feature")
5. No period at the end of the message
6. Capitalize the first letter of the subject
7. Consider the broader context of the changes, not just the immediate diff

Choose the most appropriate type from this list:

- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Changes that do not affect the meaning of the code
- refactor: A code change that neither fixes a bug nor adds a feature
- perf: A code change that improves performance
- test: Adding missing tests or correcting existing tests
- build: Changes that affect the build system or external dependencies
- ci: Changes to our CI configuration files and scripts
- chore: Other changes that don't modify src or test files
- revert: Reverts a previous commit

Examples of good commit messages:
- feat(auth): Add user authentication feature
- fix(api): Resolve null pointer exception in login process
- docs: Fix typo in API documentation
- refactor(data): Simplify data processing algorithm
- feat(api)!: Remove deprecated endpoints

Additional Guidelines:
- Be specific and concise, but clear and descriptive
- Focus on why the change was made, not how
- Use consistent terminology and phrasing across similar types of changes
- Avoid redundant information (e.g., don't repeat the type in the subject)
- When in doubt, prioritize clarity over brevity

IMPORTANT: Respond ONLY with the commit message. Do not include any other text, explanations, or metadata. The entire response should be a single line containing only the commit message.`;

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
