import assert from 'node:assert';
import { describe, it } from 'node:test';
import { ai, openAI, claudeAI, prompt } from './ai';

describe('prompt', function () {
	it('should return the expected prompt string', function () {
		const expectedPrompt = `Generate a concise git commit message for the following code diff with these specifications:

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

		assert.strictEqual(prompt, expectedPrompt);
	});
});

describe('ai()', function () {
	it('should return the correct AI service based on the provider type', function () {
		assert.strictEqual(ai('openai'), openAI);
		assert.strictEqual(ai('claudeai'), claudeAI);
		assert.strictEqual(ai(undefined), openAI);
	});
});
