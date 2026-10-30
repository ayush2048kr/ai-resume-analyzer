/**
 * Server entry point — imports the app and starts listening.
 * The app logic lives in app.js for testability.
 */
const app = require('./app');

const PORT = process.env.PORT || 8000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});