import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  res.json({
    message: 'Hello, World!'
  });
});

app.get('/convenience-zones', async (req, res) => {
  const zones = await prisma.convenienceZone.findMany();
  res.json({
    data: zones
  });
});

app.post('/convenience-zones', async (req, res) => {
  const { name, label, latitude, longitude, cbg_list, size } = req.body;

  const zone = await prisma.convenienceZone.create({
    data: {
      name,
      label,
      latitude,
      longitude,
      cbg_list,
      size
    }
  });

  res.json({
    data: zone
  });
});

const port = 1890;
app.listen(port);
console.log(`Server is listening on port ${port}`);
