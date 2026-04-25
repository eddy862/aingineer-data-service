import express from 'express';
import cors from 'cors';

import uploadRoutes from './routes/upload.routes';
import datasetRoutes from './routes/dataset.routes';
import queryRoutes from './routes/query.routes';

const app = express();

app.use(cors({
    origin: "http://localhost:5173", 
}));
app.use(express.json()); // parse JSON request bodies

app.use('/upload', uploadRoutes);
app.use('/datasets', datasetRoutes);
app.use('/query', queryRoutes);

export default app;