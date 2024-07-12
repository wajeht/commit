import path from 'node:path';
import OpenAI from 'openai';
import dotenv  from 'dotenv'
import express, { Request, Response, NextFunction } from 'express';

dotenv.config({ path: path.resolve(path.join(process.cwd(), '.env'))});

const PORT = process.env.PORT || 80;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.get('/healthz', async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({ message: 'ok' });
  } catch (error) {
    next(error);
  }
});

app.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const message = `run this command: 'git --no-pager diff | jq -Rs '{"diff": .}' | curl -X POST "http://localhost" -H "Content-Type: application/json" -d @-'`
    return res.status(200).json({ message });
  } catch (error) {
    next(error);
  }
});

app.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const { diff }  = req.body;

    const prompt = [
      'Generate a concise git commit message written in present tense for the following code diff with the given specifications below:',
      'Message language: english',
      'Commit message must be a maximum of 72 characters.',
      'Exclude anything unnecessary such as translation. Your entire response will be passed directly into git commit.',
      'The output response must be in format:',
      `Choose a type from the type-to-description JSON below that best describes the git diff:\n${JSON.stringify(
        {
          docs: 'Documentation only changes',
          style: 'Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)',
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
        2
      )}`
    ].filter(Boolean).join('\n');

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
          content: prompt,
        },
        {
          role: 'user',
          content: diff.trim(),
        },
      ],
    });

    const message = Array.from(new Set(chatCompletion.choices.filter((choice) => choice.message?.content).map((choice) => choice.message.content)))[0];
    return res.status(200).json({ message });
  } catch (error) {
    next(error);
  }
});

app.use((req: Request, res: Response, next: NextFunction) => {
  return res.status(404).json({ message: "not found" });
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  return res.status(500).json({ message: "error" });
})

app.listen(PORT, () => {
  console.log(`Server was started on http://localhost:${PORT}`);
})
