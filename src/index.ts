import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { GOOGLE_API_KEY } from './env.js';
import { z } from 'zod';

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
app.use(express.json({ limit: '20mb' }));

app.get('/', async (req, res) => {
  res.json({
    message: 'Hello, World!'
  });
});

const postLookupZipSchema = z.object({
  location: z.string().nonempty()
});

app.post('/lookup-zip', async (req, res) => {
  const parse = postLookupZipSchema.safeParse(req.body);

  if (!parse.success) {
    res.status(400).json({
      message: 'Please specify a location'
    });

    return;
  }

  const { location } = parse.data;

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
  const zones = await prisma.convenienceZone.findMany({
    include: {
      papdata: {
        select: {
          id: true
        }
      }
    }
  });
  res.json({
    data: zones.map((zone) => ({
      ...zone,
      papdata: undefined,
      ready: !!zone.papdata
    }))
  });
});

const postConvZonesSchema = z.object({
  name: z.string().nonempty(),
  latitude: z.number(),
  longitude: z.number(),
  cbg_list: z.array(z.string()),
  start_date: z.string().datetime(),
  size: z.number().nonnegative()
});

app.post('/convenience-zones', async (req, res) => {
  const parse = postConvZonesSchema.safeParse(req.body);

  if (!parse.success) {
    res.status(400).json({
      message: 'Invalid schema'
    });

    return;
  }

  const { name, latitude, longitude, cbg_list, start_date, size } = parse.data;

  const zone = await prisma.convenienceZone.create({
    data: {
      name,
      latitude,
      longitude,
      cbg_list,
      start_date,
      size
    }
  });

  res.json({
    data: zone
  });
});

const postPatternsSchema = z.object({
  czone_id: z.number().nonnegative(),
  papdata: z.object({}).passthrough(),
  patterns: z.object({}).passthrough()
});

app.post('/patterns', async (req, res) => {
  const parse = postPatternsSchema.safeParse(req.body);

  if (!parse.success) {
    res.status(400).json({
      message: 'Please send a full JSON body'
    });

    return;
  }

  const { czone_id, patterns, papdata } = parse.data;

  const papdata_obj = await prisma.paPData.create({
    data: {
      papdata: JSON.stringify(papdata),
      czone_id: czone_id
    }
  });

  const patterns_obj = await prisma.movementPattern.create({
    data: {
      patterns: JSON.stringify(patterns),
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

const getPatternsSchema = z.object({
  czone_id: z.coerce.number().nonnegative()
});

app.get('/patterns/:czone_id', async (req, res) => {
  const parse = getPatternsSchema.safeParse(req.params);

  if (!parse.success) {
    res.status(400).json({
      message: 'Please specify a convenience zone ID #'
    });

    return;
  }

  const czone_id = parse.data.czone_id;

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
