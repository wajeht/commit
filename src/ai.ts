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
export const prompt = `Generate a single-line git commit message based on the provided information about staged and committed files, and the full diff. Adhere strictly to these specifications:
1. Format: <type>: <subject> OR <type>(<scope>): <subject>
   - <scope> is optional and should only be used when it adds significant clarity
2. Maximum length: 72 characters (including type and scope)
3. Use present tense and imperative mood
4. Capitalize the first letter of the subject
5. No period at the end
6. Message in only English language

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting, missing semi colons, etc)
- refactor: Code refactoring
- perf: Performance improvements
- test: Adding or updating tests
- build: Build system or external dependency changes
- ci: CI configuration changes
- chore: Other changes that don't modify src or test files
- revert: Revert a previous commit

Guidelines:
- Be specific, concise, clear, and descriptive
- Focus on why the change was made, not how
- Use consistent terminology
- Avoid redundant information
- Analyze the file extensions to determine the appropriate type:
  - .ts, .tsx: TypeScript code (possibly React for .tsx)
  - .js, .jsx: JavaScript code (possibly React for .jsx)
  - .py: Python code
  - .go: Go code
  - .rb: Ruby code
  - .java: Java code
  - .cs: C# code
  - .cpp, .hpp, .h: C++ code
  - .md, .txt: Documentation
  - .yml, .yaml: Configuration files
  - .json: JSON data or configuration
  - .css, .scss, .less: Styling
  - .html: HTML markup
  - test.*, spec.*: Test files
- Consider both staged and committed files in determining the scope and nature of the change
- Analyze the full diff to understand the context and extent of the changes
- Only include scope when it significantly clarifies the change and fits within the character limit

Examples:
- feat(auth): Add user authentication feature
- fix(api): Resolve null pointer exception in login process
- docs: Update API endpoints documentation
- refactor(data): Simplify data processing algorithm
- test(utils): Add unit tests for string manipulation functions
- style: Format code according to style guide
- perf: Optimize database query for faster results

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
