import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const targetUrl = __ENV.TARGET_URL;
const method = (__ENV.METHOD || 'GET').toUpperCase();
const headers = __ENV.HEADERS ? JSON.parse(__ENV.HEADERS) : { 'Content-Type': 'application/json' };
const body = __ENV.BODY || null;
const vus = parseInt(__ENV.VUS) || 10;
const duration = __ENV.DURATION || '30s';
const stages = __ENV.STAGES ? JSON.parse(__ENV.STAGES) : [{ duration: duration, target: vus }];
const thresholds = __ENV.THRESHOLDS ? JSON.parse(__ENV.THRESHOLDS) : {
  http_req_duration: ['p(95)<2000'],
  http_req_failed: ['rate<0.01'],
};

export let options = {
  stages: stages,
  thresholds: thresholds,
  noConnectionReuse: false,
  userAgent: 'k6-runner/1.0',
};

export default function () {
  group('main request', function () {
    let params = { headers: headers };
    let res;

    if (method === 'GET') {
      res = http.get(targetUrl, params);
    } else if (method === 'POST') {
      res = http.post(targetUrl, body, params);
    } else if (method === 'PUT') {
      res = http.put(targetUrl, body, params);
    } else if (method === 'DELETE') {
      res = http.del(targetUrl, body, params);
    } else {
      res = http.request(method, targetUrl, body, params);
    }

    check(res, {
      'is status 2xx': (r) => r.status >= 200 && r.status < 300,
      'is status 3xx': (r) => r.status >= 300 && r.status < 400,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });

    sleep(1);
  });
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
