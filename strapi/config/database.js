module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'bookshelf',
      settings: {
        client: 'mysql',
        host: env('DATABASE_HOST', '0.0.0.0'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        username: env('DATABASE_USERNAME', 'daesoo94'),
        password: env('DATABASE_PASSWORD', 'vndtkstla2'),
        ssl: env.bool('DATABASE_SSL', false),
      },
      options: {}
    },
  },
});
