import { OpenAI } from 'openai';
import { appConfig } from './config';
import { ValidationError } from './error';
import { AIService, Provider } from './types';
import Anthropic from '@anthropic-ai/sdk';
import { getRandomElement } from './util';

/**
 * Reference
 *
 * https://github.com/Nutlope/aicommits/blob/develop/src/utils/prompt.ts
 *
 */
export function generatePrompt(): string {
	return [
		'Generate a concise git commit message written in present tense for the following code diff with the given specifications below:',
		'Message language: english',
		'Commit message must be a maximum of 72 characters.',
		'Exclude anything unnecessary such as translation. Your entire response will be passed directly into git commit.',
		'The commit message will always need to have slug follow by a commit message',
		'The output response must be in format:',
		`Choose a type from the type-to-description JSON below that best describes the git diff:\n${JSON.stringify(
			{
				docs: 'Documentation only changes',
				style:
					'Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)',
				refactor: 'A code change that neither fixes a bug nor adds a feature',
				perf: 'A code change that improves performance',
				test: 'Adding missing tests or correcting existing tests',
				build: 'Changes that affect the build system or external dependencies',
				ci: 'Changes to our CI configuration files and scripts',
				chore: "Other changes that don't modify src or test files",
				revert: 'Reverts a previous commit',
				feat: 'A new feature',
				fix: 'A bug fix',
			},
			null,
			2,
		)}`,
	]
		.filter(Boolean)
		.join('\n');
}

export function openAI(apiKey: string): AIService {
	const openai = new OpenAI({ apiKey });

	return {
		async generateCommitMessage(diff: string): Promise<string | null> {
			try {
				const chatCompletion = await openai.chat.completions.create({
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
							content: generatePrompt(),
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
				throw error;
			}
		},
	};
}

export function claudeAI(apiKey: string): AIService {
	const anthropic = new Anthropic({ apiKey });

	return {
		async generateCommitMessage(diff: string) {
			// eslint-disable-next-line no-useless-catch
			try {
				const messages = await anthropic.messages.create({
					max_tokens: 1024,
					model: 'claude-3-opus-20240229',
					messages: [
						{
							role: 'assistant',
							content: generatePrompt(),
						},
						{
							role: 'user',
							content: diff,
						},
					],
				});
				return messages;
			} catch (error: any) {
				throw error;
			}
		},
	};
}

export function aiProvider(type?: Provider): AIService {
	switch (type) {
		case 'claudeai':
			return claudeAI(appConfig.CLAUDE_API_KEY);
		case 'openai':
		default:
			return openAI(appConfig.OPENAI_API_KEY);
	}
}
