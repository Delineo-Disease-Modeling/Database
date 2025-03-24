import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { GOOGLE_API_KEY } from './env.js';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  res.json({
    message: 'Hello, World!'
  });
});

app.post('/lookup-zip', async (req, res) => {
  const { location } = req.body;

  const api_uri = 'https://maps.googleapis.com/maps/api/geocode/json';

  const resp = await fetch(
    `${api_uri}?address=${encodeURIComponent(location)}&key=${GOOGLE_API_KEY}`
  );

  // TODO: Fix typing issues

  const json = await resp.json();
  const components = Object.values(json['results']).find(
    (x) => !!x['address_components']
  )['address_components'];

  const zip_code = Object.values(components).find((x) =>
    x['types']?.includes('postal_code')
  );

  if (!zip_code) {
    // Reverse lookup time
    const geometry = Object.values(json['results']).find(
      (x) => !!x['geometry']
    )['geometry'];

    // This gives us lat & long
    const location = geometry['location'];

    const loc_resp = await fetch(
      `${api_uri}?latlng=${encodeURIComponent(`${location['lat']},${location['lng']}`)}&key=${GOOGLE_API_KEY}`
    );

    const loc_json = await loc_resp.json();

    const res_json = { zip_code: '', city: '' };

    for (const result of loc_json['results']) {
      for (const cat of result['address_components']) {
        if (cat['types'].includes('postal_code')) {
          res_json['zip_code'] = cat['long_name'];
        }

        if (cat['types'].includes('locality')) {
          res_json['city'] = cat['long_name'];
        }
      }
    }

    res.json(res_json);
  } else {
    const city = Object.values(components).find((x) =>
      x['types']?.includes('locality')
    );

    res.json({
      zip_code: zip_code['long_name'],
      city: city['long_name']
    });
  }
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
