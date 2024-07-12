import OpenAI from 'openai';
import path from "node:path";
import { appConfig } from "./config";
import { NextFunction, Request, Response} from "express";
import { ValidationError } from './error';

interface GenerateCommitMessageRequest extends Request {
  body: {
    diff: string;
  }
}

export function healthzHandler(req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(200).json({ message: 'ok' });
  } catch (error) {
    next(error);
  }
}

export function downloadCommitDotShHandler(req: Request, res: Response, next: NextFunction){
  try {
    const commitDotSh = path.resolve(path.join(process.cwd(), 'commit.sh'));
    return res.status(200).download(commitDotSh);
  } catch (error) {
    next(error);
  }
}

export function indexHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const host = req.hostname;
    const protocol = req.protocol;
    const port = req.get('host')?.split(':')[1] || '';
    const url = `${protocol}://${host}${port ? ':' + port : ''}`;
    const message = `run this command: "wget ${url}/commit.sh"`;
    return res.status(200).json({ message });
  } catch (error) {
    next(error);
  }
}

export async function generateCommitMessageHandler (req: GenerateCommitMessageRequest, res: Response, next: NextFunction){
  try {
    const { diff }  = req.body;

    if (diff.trim() === '') {
      throw new ValidationError('must not be empty!')
    }

    const openai = new OpenAI({ apiKey: appConfig.OPENAI_API_KEY });

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
};
