const { connectDB } = require('./config/db');
const config = require('./config/index');

(async () => {
  await connectDB();

  const User = require('./models/User');
  const count = await User.countDocuments();
  if (count === 0) {
    console.log('First boot: seeding default data…');
    const { seed } = require('./seed/seed');
    await seed();
  }

  const app = require('./app');
  app.listen(config.port, '0.0.0.0', () =>
    console.log(`HMS API running on port ${config.port}`)
  );
})().catch((err) => {
  console.error('Startup failed', err);
  process.exit(1);
});