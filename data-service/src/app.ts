import express from 'express';
import cors from 'cors';

import uploadRoutes from './routes/upload.routes';
import datasetRoutes from './routes/dataset.routes';
import queryRoutes from './routes/query.routes';
import morgan from 'morgan';

const app = express();

app.use(cors({
    origin: "http://localhost:5173", 
}));

app.use(morgan('dev'))
app.use(express.json()); // parse JSON request bodies

app.use('/upload', uploadRoutes);
app.use('/datasets', datasetRoutes);
app.use('/query', queryRoutes);

// global error handler
app.use((err: any, req: any, res: any, next: any) => {
  if (err.message.includes("Only CSV and XLSX")) {
    return res.status(400).json({ error: err.message });
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;