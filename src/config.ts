import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(path.join(process.cwd(), '.env')) });

export const appConfig = Object.freeze({
	IPS: process.env.IPS as unknown as string,
	PORT: (process.env.PORT as unknown as number) || 80,
	OPENAI_API_KEY: process.env.OPENAI_API_KEY as unknown as string,
});
