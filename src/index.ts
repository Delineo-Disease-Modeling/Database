import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { PrismaClient } from '@prisma/client';
import { GOOGLE_API_KEY } from './env.js';
import { zValidator } from '@hono/zod-validator';
import {
  deleteConvZonesSchema,
  getPatternsQuerySchema,
  getPatternsSchema,
  getSimDataSchema,
  postConvZonesSchema,
  postLookupZipSchema,
  postPatternsSchema,
  postSimDataSchema
} from './schemas.js';
import { streamText } from 'hono/streaming';

const app = new Hono();
const prisma = new PrismaClient();

app.use('*', trimTrailingSlash());

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Set-Cookie'],
    credentials: true
  })
);

app.onError((err, c) => {
  return c.json(
    {
      message: 'An unknown error occurred'
    },
    500
  );
});

interface GeocodeResponse {
  results: {
    address_components?: {
      long_name: string;
      types: string[];
    }[];
    geometry?: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }[];
  status: string;
}

app.get('/', async (c) => {
  return c.json({
    message: 'Hello, World!'
  });
});

app.post('/lookup-zip', zValidator('json', postLookupZipSchema), async (c) => {
  const { location } = c.req.valid('json');

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
    return c.json({ error: 'No address components found' }, 400);
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
      return c.json({ error: 'No geometry found for reverse lookup' }, 400);
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

    return c.json(res_json);
  } else {
    // If postal code is found, look for the city.
    const cityComponent = components.find((component) =>
      component.types.includes('locality')
    );

    return c.json({
      zip_code: zipCodeComponent.long_name,
      city: cityComponent ? cityComponent.long_name : ''
    });
  }
});

app.get('/convenience-zones', async (c) => {
  const zones = await prisma.convenienceZone.findMany({
    include: {
      papdata: {
        select: {
          id: true
        }
      }
    }
  });

  return c.json({
    data: zones.map((zone) => ({
      ...zone,
      papdata: undefined,
      ready: !!zone.papdata
    }))
  });
});

app.post(
  '/convenience-zones',
  zValidator('json', postConvZonesSchema),
  async (c) => {
    const { name, latitude, longitude, cbg_list, start_date, size } =
      c.req.valid('json');

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

    return c.json({
      data: zone
    });
  }
);

app.delete(
  '/convenience-zones/:czone_id',
  zValidator('param', deleteConvZonesSchema),
  async (c) => {
    try {
      const { czone_id } = c.req.valid('param');
      const zone = await prisma.convenienceZone.delete({
        where: {
          id: czone_id
        }
      });

      return c.json({
        data: zone
      });
    } catch (error) {
      return c.json(
        {
          message: error
        },
        400
      );
    }
  }
);

app.post('/patterns', zValidator('json', postPatternsSchema), async (c) => {
  const { czone_id, patterns, papdata } = c.req.valid('json');

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

  return c.json({
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

app.get(
  '/patterns/:czone_id',
  zValidator('param', getPatternsSchema),
  zValidator('query', getPatternsQuerySchema),
  async (c) => {
    const { czone_id } = c.req.valid('param');
    const { stream } = c.req.valid('query');

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
      return c.json(
        {
          message: 'Could not find patterns or papdata'
        },
        404
      );
    }

    if (stream) {
      return streamText(c, async (stream) => {
        await stream.write(`${papdata_obj.papdata}\n`);

        const patterns = JSON.parse(patterns_obj.patterns);
        const timestamps = Object.keys(patterns).sort((a, b) => +a - +b);

        for (const curtime of timestamps) {
          await stream.write(`${JSON.stringify(patterns[curtime])}\n`);
        }
      });
    }

    // Not streaming? return data as normal
    return c.json({
      data: {
        papdata: JSON.parse(papdata_obj.papdata),
        patterns: JSON.parse(patterns_obj.patterns)
      }
    });
  }
);

app.post('/simdata', zValidator('json', postSimDataSchema), async (c) => {
  const { simdata, czone_id } = c.req.valid('json');

  await prisma.simData.upsert({
    where: {
      czone_id: czone_id
    },
    update: {
      simdata: simdata
    },
    create: {
      czone_id: czone_id,
      simdata: simdata
    }
  });

  return c.json({
    message: `Successfully added simulator cache data to zone #${czone_id}`
  });
});

app.get(
  '/simdata/:czone_id',
  zValidator('param', getSimDataSchema),
  async (c) => {
    const { czone_id } = c.req.valid('param');

    const simdata = await prisma.simData.findUnique({
      where: { czone_id: czone_id }
    });

    if (!simdata) {
      return c.json(
        {
          message: 'Could not find associated simdata'
        },
        404
      );
    }

    return c.json({
      data: simdata.simdata
    });
  }
);

const port = 1890;
serve({ fetch: app.fetch, port });
console.log(`Server is listening on port ${port}`);
