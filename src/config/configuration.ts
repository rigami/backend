export default () => ({
    port: parseInt(process.env.PORT, 10) || 8080,
    database: {
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT, 10) || 27017,
    },
    wallpapers: {
        blockingThreshold: 1,
        unsplash: {
            apiKey: process.env.WALLPAPERS_UNSPLASH_APIKEY || 'aNKMtY5TfBYTWYmiNfPQK-uU7xteo5mxOOgdvTd4f18',
        },
        pexels: {
            apiKey: process.env.WALLPAPERS_PEXELS_APIKEY || '563492ad6f91700001000001c3e07ae51e6941cb87adc4362b4e328a',
        },
        pixabay: {
            apiKey: process.env.WALLPAPERS_PIXABAY_APIKEY || '5843520-2c340ccc21b8d0ac9fa75a177',
        },
    },
});
