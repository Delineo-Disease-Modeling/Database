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

const port = 1890;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

/* previous implementation commented out */

// app.post('/lookup-zip', async (req, res) => {
//   const { location } = req.body;

//   const api_uri = 'https://maps.googleapis.com/maps/api/geocode/json';

//   const resp = await fetch(
//     `${api_uri}?address=${encodeURIComponent(location)}&key=${GOOGLE_API_KEY}`
//   );

// TODO: Fix typing issues

/* previous implementation commented out */

//   const json = await resp.json();
//   const components = Object.values(json['results']).find(
//     (x) => !!x['address_components']
//   )['address_components'];

//   const zip_code = Object.values(components).find((x) =>
//     x['types']?.includes('postal_code')
//   );

//   if (!zip_code) {
//     // Reverse lookup time
//     const geometry = Object.values(json['results']).find(
//       (x) => !!x['geometry']
//     )['geometry'];

//     // This gives us lat & long
//     const location = geometry['location'];

//     const loc_resp = await fetch(
//       `${api_uri}?latlng=${encodeURIComponent(`${location['lat']},${location['lng']}`)}&key=${GOOGLE_API_KEY}`
//     );

//     const loc_json = await loc_resp.json();

//     const res_json = { zip_code: '', city: '' };

//     for (const result of loc_json['results']) {
//       for (const cat of result['address_components']) {
//         if (cat['types'].includes('postal_code')) {
//           res_json['zip_code'] = cat['long_name'];
//         }

//         if (cat['types'].includes('locality')) {
//           res_json['city'] = cat['long_name'];
//         }
//       }
//     }

//     res.json(res_json);
//   } else {
//     const city = Object.values(components).find((x) =>
//       x['types']?.includes('locality')
//     );

//     res.json({
//       zip_code: zip_code['long_name'],
//       city: city['long_name']
//     });
//   }
// });

// app.get('/convenience-zones', async (req, res) => {
//   const zones = await prisma.convenienceZone.findMany();
//   res.json({
//     data: zones
//   });
// });

// app.post('/convenience-zones', async (req, res) => {
//   const { name, label, latitude, longitude, cbg_list, size } = req.body;

//   const zone = await prisma.convenienceZone.create({
//     data: {
//       name,
//       label,
//       latitude,
//       longitude,
//       cbg_list,
//       size
//     }
//   });

//   res.json({
//     data: zone
//   });
// });

// const port = 1890;
// app.listen(port);
// console.log(`Server is listening on port ${port}`);
