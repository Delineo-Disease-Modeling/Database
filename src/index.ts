import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get('/', async (req, res) => {
  res.json({
    success: true,
    message: 'Hello, World!'
  });
});

app.get('/convenience-zones', async (req, res) => {
  const zones = await prisma.convenienceZone.findMany();
  res.json({
    success: true,
    data: zones
  });
});

app.post('/convenience-zones', async (req, res) => {
  const { name, latitude, longitude, cbg_list, size } = req.body;

  const zone = await prisma.convenienceZone.create({
    data: {
      name,
      latitude,
      longitude,
      cbg_list,
      size
    }
  });

  res.json({
    success: true,
    data: zone
  });
});

const port = 3000;
app.listen(port);
console.log(`Server is listening on port ${port}`);
