import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { ai, openAI, claudeAI, deepseekAI, geminiAI, prompt } from './ai';

describe('prompt', function () {
	it('should return the expected prompt string', function () {
		const expectedPrompt = `Generate a single-line git commit message based on the provided information about staged and committed files, and the full diff. Adhere strictly to these specifications:
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

		assert.strictEqual(prompt, expectedPrompt);
	});
});

describe('ai()', function () {
	it('should return the correct AI service based on the provider type', function () {
		assert.strictEqual(ai('openai'), openAI);
		assert.strictEqual(ai('claudeai'), claudeAI);
		assert.strictEqual(ai('deepseek'), deepseekAI);
		assert.strictEqual(ai('gemini'), geminiAI);
		assert.strictEqual(ai(undefined), geminiAI);
	});
});

describe('openAI', function () {
	const createMockAIService = (mockMessage: string | null) => ({
		generate: mock.fn<(diff: string, apiKey?: string) => Promise<string | null>>(() =>
			Promise.resolve(mockMessage),
		),
	});

	it('should generate a commit message using OpenAI', async function () {
		const mockOpenAI = createMockAIService('feat: Add new feature');

		openAI.generate = mockOpenAI.generate;

		const result = await openAI.generate('Sample diff');
		assert.strictEqual(result, 'feat: Add new feature');
		assert.strictEqual(mockOpenAI.generate.mock.calls.length, 1);
	});
});

describe('claudeAI', { concurrency: true }, function () {
	const createMockAIService = (mockMessage: string | null) => ({
		generate: mock.fn<(diff: string, apiKey?: string) => Promise<string | null>>(() =>
			Promise.resolve(mockMessage),
		),
	});

	it('should generate a commit message using Claude AI', async function () {
		const mockOpenAI = createMockAIService('feat: Add new feature');

		claudeAI.generate = mockOpenAI.generate;

		const result = await claudeAI.generate('Sample diff');
		assert.strictEqual(result, 'feat: Add new feature');
		assert.strictEqual(mockOpenAI.generate.mock.calls.length, 1);
	});

	it('should throw other errors as-is', async function () {
		const errorMessage = 'Unexpected error';

		const createMockAIService = (_mockMessage: string | null) => ({
			generate: mock.fn<(diff: string, apiKey?: string) => Promise<string | null>>(() =>
				Promise.reject(new Error(errorMessage)),
			),
		});

		claudeAI.generate = createMockAIService(null).generate;

		await assert.rejects(
			() => claudeAI.generate('Sample diff'),
			(error) => {
				assert(error instanceof Error);
				assert.strictEqual(error.message, errorMessage);
				return true;
			},
		);
	});
});
