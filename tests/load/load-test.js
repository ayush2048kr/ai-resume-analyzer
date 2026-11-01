/**
 * Load Test: Simulate Many Users Together
 * 
 * Uses native Node.js to simulate concurrent users hitting the API.
 * No external dependencies needed — pure http/https requests.
 * 
 * Usage: node tests/load/load-test.js
 * 
 * What it does:
 * 1. Hits GET /api/health with 100 concurrent requests
 * 2. Hits POST /api/analyze with 50 concurrent multipart uploads
 * 3. Reports: total time, avg response time, success rate, errors
 */

const http = require('http');
const { URL } = require('url');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const HEALTH_CONCURRENCY = 100;
const UPLOAD_CONCURRENCY = 50;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const parsedUrl = new URL(url);

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          duration: Date.now() - start,
          data,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 0,
        duration: Date.now() - start,
        error: err.message,
      });
    });

    // Timeout after 30s
    req.setTimeout(30000, () => {
      req.destroy();
      resolve({
        status: 0,
        duration: Date.now() - start,
        error: 'Timeout after 30s',
      });
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

const VALID_PDF_STRING =
  '%PDF-1.4\n' +
  '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
  '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
  '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n' +
  '4 0 obj\n<< /Length 72 >>\nstream\n' +
  'BT\n/F1 12 Tf\n72 712 Td\n(John Doe Software Engineer JavaScript React Node.js AWS Docker) Tj\nET\n' +
  'endstream\nendobj\n' +
  '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n' +
  'xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000366 00000 n \n' +
  'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n442\n%%EOF';

function createMultipartBody(boundary) {
  const jobDesc = 'Senior Full Stack Developer with React, Node.js, and Docker experience';

  let body = '';
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="resume.pdf"\r\n`;
  body += `Content-Type: application/pdf\r\n\r\n`;
  body += `${VALID_PDF_STRING}\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="jobDescription"\r\n\r\n`;
  body += `${jobDesc}\r\n`;
  body += `--${boundary}--\r\n`;
  return body;
}

function printResults(label, results) {
  const successful = results.filter((r) => r.status >= 200 && r.status < 300);
  const failed = results.filter((r) => r.status === 0 || r.status >= 400);
  const durations = results.map((r) => r.duration);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const p95 = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Total Requests:   ${results.length}`);
  console.log(`  ✅ Successful:     ${successful.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Failed:         ${failed.length}`);
  console.log(`  ⏱  Avg Response:   ${avg.toFixed(0)}ms`);
  console.log(`  ⏱  Min Response:   ${min}ms`);
  console.log(`  ⏱  Max Response:   ${max}ms`);
  console.log(`  ⏱  P95 Response:   ${p95}ms`);

  if (failed.length > 0) {
    const errorCounts = {};
    failed.forEach((r) => {
      const key = r.error || `HTTP ${r.status}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    console.log(`\n  Error Breakdown:`);
    Object.entries(errorCounts).forEach(([err, count]) => {
      console.log(`    • ${err}: ${count}`);
    });
  }
  console.log('');
}

// ─────────────────────────────────────────────
// Test Scenarios
// ─────────────────────────────────────────────

async function testHealthEndpoint() {
  console.log(`\n🏋️ Load Test: ${HEALTH_CONCURRENCY} concurrent GET /api/health`);

  const promises = [];
  for (let i = 0; i < HEALTH_CONCURRENCY; i++) {
    promises.push(makeRequest(`${BACKEND_URL}/api/health`));
  }

  const results = await Promise.all(promises);
  printResults(`GET /api/health (${HEALTH_CONCURRENCY} concurrent)`, results);
  return results;
}

async function testUploadEndpoint() {
  console.log(`\n🏋️ Load Test: ${UPLOAD_CONCURRENCY} concurrent POST /api/analyze`);

  const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
  const body = createMultipartBody(boundary);

  const promises = [];
  for (let i = 0; i < UPLOAD_CONCURRENCY; i++) {
    promises.push(
      makeRequest(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': Buffer.byteLength(body).toString(),
        },
        body,
      })
    );
  }

  const results = await Promise.all(promises);
  printResults(`POST /api/analyze (${UPLOAD_CONCURRENCY} concurrent)`, results);
  return results;
}

async function testSustainedLoad() {
  console.log(`\n🏋️ Sustained Load: 10 requests/sec for 5 seconds`);

  const results = [];
  const duration = 5; // seconds
  const rps = 10;

  for (let sec = 0; sec < duration; sec++) {
    const batchPromises = [];
    for (let i = 0; i < rps; i++) {
      batchPromises.push(makeRequest(`${BACKEND_URL}/api/health`));
    }
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    // Wait approximately 1 second before next batch
    if (sec < duration - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  printResults(`Sustained Load (${rps} rps × ${duration}s = ${rps * duration} total)`, results);
  return results;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  AI Resume Analyzer — Load Test Suite                   ║');
  console.log(`║  Target: ${BACKEND_URL.padEnd(47)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  // 1. Quick health check first
  try {
    const check = await makeRequest(`${BACKEND_URL}/api/health`);
    if (check.status !== 200) {
      console.error('\n❌ Backend is not reachable. Start it first with: cd backend && node server.js');
      process.exit(1);
    }
    console.log('\n✅ Backend is up and running.\n');
  } catch (e) {
    console.error('\n❌ Cannot connect to backend:', e.message);
    process.exit(1);
  }

  // 2. Run tests
  const startTime = Date.now();

  await testHealthEndpoint();
  await testUploadEndpoint();
  await testSustainedLoad();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║  All load tests completed in ${totalTime}s`.padEnd(59) + '║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
