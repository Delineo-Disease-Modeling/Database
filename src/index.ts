import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { GOOGLE_API_KEY } from './env.js';

interface GeocodeComponent {
  long_name: string;
  types: string[];
}

interface Geometry {
  location: {
    lat: number;
    lng: number;
  };
}

interface GeocodeResult {
  address_components?: GeocodeComponent[];
  geometry?: Geometry;
}

interface GeocodeResponse {
  results: GeocodeResult[];
  status: string;
}

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
  // Use type assertion to ensure req.body has a location string.
  const { location } = req.body as { location: string };

  const api_uri = 'https://maps.googleapis.com/maps/api/geocode/json';

  // Get the geocode information for the provided location.
  const resp = await fetch(
    `${api_uri}?address=${encodeURIComponent(location)}&key=${GOOGLE_API_KEY}`
  );

  // Cast the response to our defined GeocodeResponse type.
  const json = (await resp.json()) as GeocodeResponse;

  // Find a result that includes address_components.
  const resultWithComponents = json.results.find(
    (result) => result.address_components
  );
  if (!resultWithComponents || !resultWithComponents.address_components) {
    res.status(400).json({ error: 'No address components found' });
    return;
  }
  const components = resultWithComponents.address_components;

  // Look for a postal code within the components.
  const zipCodeComponent = components.find((component) =>
    component.types.includes('postal_code')
  );

  if (!zipCodeComponent) {
    // If postal code isn't found, attempt reverse geocoding.
    const resultWithGeometry = json.results.find((result) => result.geometry);
    if (!resultWithGeometry || !resultWithGeometry.geometry) {
      res.status(400).json({ error: 'No geometry found for reverse lookup' });
      return;
    }
    // Rename inner variable to avoid shadowing the outer "location"
    const geoLocation = resultWithGeometry.geometry.location;

    const loc_resp = await fetch(
      `${api_uri}?latlng=${encodeURIComponent(
        `${geoLocation.lat},${geoLocation.lng}`
      )}&key=${GOOGLE_API_KEY}`
    );

    const loc_json = (await loc_resp.json()) as GeocodeResponse;
    const res_json: { zip_code: string; city: string } = {
      zip_code: '',
      city: ''
    };

    for (const result of loc_json.results) {
      if (result.address_components) {
        for (const comp of result.address_components) {
          if (comp.types.includes('postal_code')) {
            res_json.zip_code = comp.long_name;
          }
          if (comp.types.includes('locality')) {
            res_json.city = comp.long_name;
          }
        }
      }
    }

    res.json(res_json);
  } else {
    // If postal code is found, look for the city.
    const cityComponent = components.find((component) =>
      component.types.includes('locality')
    );
    res.json({
      zip_code: zipCodeComponent.long_name,
      city: cityComponent ? cityComponent.long_name : ''
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

app.post('/patterns', async (req, res) => {
  const { cz_id, patterns, papdata } = req.body;

  const czone_id = +cz_id;

  const papdata_obj = await prisma.paPData.create({
    data: {
      papdata: papdata,
      czone_id: czone_id
    }
  });

  const patterns_obj = await prisma.movementPattern.create({
    data: {
      patterns: patterns,
      start_date: new Date(),
      czone_id: czone_id
    }
  });

  res.json({
    data: {
      papdata: {
        id: papdata_obj.id
      },
      patterns: {
        id: patterns_obj.id
      }
    }
  });
});

app.get('/patterns/:czone_id', async (req, res) => {
  const czone_id = +req.params.czone_id;

  const papdata_obj = await prisma.paPData.findUnique({
    where: {
      czone_id: czone_id
    }
  });

  const patterns_obj = await prisma.movementPattern.findUnique({
    where: {
      czone_id: czone_id
    }
  });

  if (!papdata_obj || !patterns_obj) {
    res.status(404).json({
      message: 'Could not find patterns or papdata'
    });

    return;
  }

  res.json({
    data: {
      papdata: JSON.parse(papdata_obj.papdata),
      patterns: JSON.parse(patterns_obj.patterns)
    }
  });
});

const port = 1890;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
