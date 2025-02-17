-- CreateTable
CREATE TABLE "ConvenienceZone" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "cbg_list" TEXT[],
    "size" INTEGER NOT NULL,
    "date_of_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConvenienceZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovementPattern" (
    "id" TEXT NOT NULL,
    "dson_pattern" TEXT NOT NULL,
    "start_datetime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovementPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POI" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "cbg" TEXT NOT NULL,
    "categories" TEXT[],

    CONSTRAINT "POI_pkey" PRIMARY KEY ("id")
);
