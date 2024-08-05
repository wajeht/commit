import assert from 'node:assert';
import { describe, it } from 'node:test';
import { ai, openAI, claudeAI, prompt } from './ai';

describe('prompt', function () {
	it('should return the expected prompt string', function () {
		const expectedPrompt = `Generate a concise git commit message written in present tense for the following code diff with the given specifications:
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
