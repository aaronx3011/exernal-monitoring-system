import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MonitoringClient } from '../client';
import { ConfigurationError } from '../errors';

function mockFetchOk(): ReturnType<typeof mock.method> {
  return mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response('{"success":true}', { status: 200 })),
  );
}

void describe('MonitoringClient', () => {
  void it('throws ConfigurationError when baseUrl is missing', () => {
    assert.throws(
      () => new MonitoringClient({ baseUrl: '', apiKey: 'key' } as any),
      ConfigurationError,
    );
  });

  void it('throws ConfigurationError when apiKey is missing', () => {
    assert.throws(
      () => new MonitoringClient({ baseUrl: 'http://localhost', apiKey: '' } as any),
      ConfigurationError,
    );
  });

  void it('creates a client with valid options', () => {
    const client = new MonitoringClient({
      baseUrl: 'http://localhost:8080',
      apiKey: 'sk-test',
    });
    assert.ok(client instanceof MonitoringClient);
  });

  void it('buffers metrics and flushes them', async () => {
    const fetchMock = mockFetchOk();
    const client = new MonitoringClient({
      baseUrl: 'http://localhost:8080',
      apiKey: 'sk-test',
      flushIntervalMs: 0,
      heartbeatIntervalMs: 0,
    });

    client.metric('test.cpu', 42, { host: 'web-1' });
    client.metric('test.mem', 256);

    await client.flush();

    assert.equal(fetchMock.mock.callCount(), 1);

    const call = fetchMock.mock.calls[0];
    assert.ok(call);
    if (call) {
      const url = call.arguments[0] as string;
      const opts = call.arguments[1] as RequestInit;
      assert.ok(url.endsWith('/api/v1/metrics'));
      assert.equal(opts.method, 'POST');
      const body = JSON.parse(opts.body as string);
      assert.equal(body.length, 2);
      assert.equal(body[0].name, 'test.cpu');
      assert.equal(body[0].value, 42);
    }

    fetchMock.mock.resetCalls();
  });

  void it('buffers events and flushes them', async () => {
    const fetchMock = mockFetchOk();
    const client = new MonitoringClient({
      baseUrl: 'http://localhost:8080',
      apiKey: 'sk-test',
      flushIntervalMs: 0,
      heartbeatIntervalMs: 0,
    });

    client.event('error', 'Something broke', { service: 'auth' });

    await client.flush();

    assert.equal(fetchMock.mock.callCount(), 1);
    const call = fetchMock.mock.calls[0];
    assert.ok(call);
    if (call) {
      const url = call.arguments[0] as string;
      const opts = call.arguments[1] as RequestInit;
      assert.ok(url.endsWith('/api/v1/events'));
      const body = JSON.parse(opts.body as string);
      assert.equal(body.length, 1);
      assert.equal(body[0].level, 'error');
      assert.equal(body[0].message, 'Something broke');
    }

    fetchMock.mock.resetCalls();
  });

  void it('drops oldest metrics when buffer exceeds maxBufferSize', async () => {
    const client = new MonitoringClient({
      baseUrl: 'http://localhost:8080',
      apiKey: 'sk-test',
      flushIntervalMs: 0,
      heartbeatIntervalMs: 0,
      maxBufferSize: 3,
    });

    client.metric('m1', 1);
    client.metric('m2', 2);
    client.metric('m3', 3);
    client.metric('m4', 4);

    const fetchMock = mockFetchOk();

    await client.flush();

    assert.equal(fetchMock.mock.callCount(), 1);
    const call = fetchMock.mock.calls[0];
    assert.ok(call);
    if (call) {
      const opts = call.arguments[1] as RequestInit;
      const body = JSON.parse(opts.body as string);
      assert.equal(body.length, 3);
      assert.equal(body[0].name, 'm2');
      assert.equal(body[1].name, 'm3');
      assert.equal(body[2].name, 'm4');
    }

    fetchMock.mock.resetCalls();
  });

  void it('start() sends a heartbeat immediately', async () => {
    const fetchMock = mockFetchOk();

    const client = new MonitoringClient({
      baseUrl: 'http://localhost:8080',
      apiKey: 'sk-test',
      flushIntervalMs: 0,
      heartbeatIntervalMs: 0,
    });

    client.start();

    await new Promise((r) => setTimeout(r, 10));

    assert.equal(fetchMock.mock.callCount(), 1);
    const call = fetchMock.mock.calls[0];
    assert.ok(call);
    if (call) {
      const opts = call.arguments[1] as RequestInit;
      const body = JSON.parse(opts.body as string);
      assert.equal(body.status, 'up');
    }

    fetchMock.mock.resetCalls();
  });

  void it('stop() clears timers and flushes', async () => {
    const fetchMock = mockFetchOk();

    const client = new MonitoringClient({
      baseUrl: 'http://localhost:8080',
      apiKey: 'sk-test',
      flushIntervalMs: 0,
      heartbeatIntervalMs: 0,
    });

    client.metric('cpu', 1);
    await client.stop();

    assert.equal(fetchMock.mock.callCount(), 1);
    const call = fetchMock.mock.calls[0];
    assert.ok(call);
    if (call) {
      const url = call.arguments[0] as string;
      assert.ok(url.endsWith('/api/v1/metrics'));
    }

    fetchMock.mock.resetCalls();
  });

  void it('retries on network failure', async () => {
    let callCount = 0;
    const fetchMock = mock.method(globalThis, 'fetch', () => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve(new Response('{"success":true}', { status: 200 }));
    });

    const client = new MonitoringClient({
      baseUrl: 'http://localhost:8080',
      apiKey: 'sk-test',
      flushIntervalMs: 0,
      heartbeatIntervalMs: 0,
      maxRetries: 3,
    });

    client.metric('cpu', 1);
    await client.flush();

    assert.ok(callCount >= 3, `Expected at least 3 calls, got ${callCount}`);

    fetchMock.mock.resetCalls();
  });

  void it('sends Authorization header', async () => {
    const fetchMock = mockFetchOk();

    const client = new MonitoringClient({
      baseUrl: 'http://localhost:8080',
      apiKey: 'sk-secret-42',
      flushIntervalMs: 0,
      heartbeatIntervalMs: 0,
    });

    client.metric('cpu', 1);

    await client.flush();

    const call = fetchMock.mock.calls[0];
    assert.ok(call);
    if (call) {
      const opts = call.arguments[1] as RequestInit;
      assert.equal((opts.headers as Record<string, string>).Authorization, 'Bearer sk-secret-42');
    }

    fetchMock.mock.resetCalls();
  });
});
