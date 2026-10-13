import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import sharp from 'sharp';
import { PartRecognitionService } from './part-recognition.service';

describe('PartRecognitionService', () => {
  let service: PartRecognitionService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let image: Express.Multer.File;
  beforeEach(async () => {
    service = new PartRecognitionService(new ConfigService());
    fetchMock = jest.spyOn(globalThis, 'fetch');
    image = {
      buffer: await sharp({
        create: { width: 8, height: 8, channels: 3, background: '#ffffff' },
      })
        .png()
        .toBuffer(),
      mimetype: 'image/png',
    } as Express.Multer.File;
  });
  afterEach(() => jest.restoreAllMocks());

  it('rejects missing files before HTTP', async () => {
    await expect(service.predict(undefined)).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects forged MIME and corrupt bytes', async () => {
    await expect(
      service.predict({ ...image, mimetype: 'image/jpeg' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.predict({ ...image, buffer: Buffer.from('fake PNG') }),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('enforces configured bytes and decoded pixel limits', async () => {
    const smallBytes = new PartRecognitionService(
      new ConfigService({ AUTOPARTS_AI_MAX_IMAGE_BYTES: 1 }),
    );
    await expect(smallBytes.predict(image)).rejects.toMatchObject({
      status: 413,
    });
    const smallPixels = new PartRecognitionService(
      new ConfigService({ AUTOPARTS_AI_MAX_IMAGE_PIXELS: 1 }),
    );
    await expect(smallPixels.predict(image)).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([400, 413, 429, 503, 504])(
    'maps upstream %i without leaking upstream body',
    async (status) => {
      fetchMock.mockResolvedValue(new Response('private details', { status }));
      await expect(service.predict(image)).rejects.toMatchObject({ status });
    },
  );
  it('maps connection failure to 503', async () => {
    fetchMock.mockRejectedValue(new Error('secret internal host'));
    await expect(service.health()).rejects.toMatchObject({ status: 503 });
  });
  it('aborts timed out calls and returns 504', async () => {
    service = new PartRecognitionService(
      new ConfigService({ AUTOPARTS_AI_TIMEOUT_MS: 10 }),
    );
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    await expect(service.health()).rejects.toMatchObject({ status: 504 });
  });
  it('rejects invalid JSON, invalid health schema and excessive responses', async () => {
    fetchMock.mockResolvedValueOnce(new Response('not JSON'));
    await expect(service.health()).rejects.toMatchObject({ status: 502 });
    fetchMock.mockResolvedValueOnce(
      Response.json({ status: 'ok', model_available: 'yes' }),
    );
    await expect(service.health()).rejects.toMatchObject({ status: 502 });
    fetchMock.mockResolvedValueOnce(
      new Response('x'.repeat(2 * 1024 * 1024 + 1)),
    );
    await expect(service.health()).rejects.toMatchObject({ status: 502 });
  });
  it('rejects missing prediction nested objects', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        top_predictions: [],
        confidence_state: 'high',
        conclusive: true,
      }),
    );
    await expect(service.predict(image)).rejects.toMatchObject({ status: 502 });
  });
  it('forwards a real file and only internal API credentials', async () => {
    service = new PartRecognitionService(
      new ConfigService({ AUTOPARTS_AI_API_KEY: 'internal-test-key' }),
    );
    fetchMock.mockResolvedValue(
      Response.json({ status: 'model_unavailable', model_available: false }),
    );
    await expect(service.health()).resolves.toMatchObject({
      model_available: false,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8001/health',
      expect.objectContaining({
        headers: { 'X-API-Key': 'internal-test-key' },
        redirect: 'error',
      }),
    );
    fetchMock.mockResolvedValue(new Response('', { status: 503 }));
    await expect(service.predict(image)).rejects.toBeInstanceOf(HttpException);
    const body = fetchMock.mock.calls.at(-1)?.[1]?.body as FormData;
    expect(body.get('file')).toBeInstanceOf(Blob);
  });
  it('accepts the Python prediction contract including nullable metadata', async () => {
    // Synthetic fixture validates transport only, never a model prediction.
    const part = {
      id: 0,
      original_name: 'fixture class',
      training_label: 'fixture class',
      spanish_name: null,
      translation_source: null,
      image_counts: { train: 2, val: 1, test: 1 },
      metadata: {},
    };
    const prediction = { class_info: part, confidence: 0.6 };
    const payload = {
      prediction,
      top_predictions: [prediction],
      confidence_state: 'low',
      conclusive: false,
      thresholds: { conclusive: 0.7, high: 0.9 },
      analysis: {
        model: 'fixture',
        dataset: { slug: 'fixture', license: null },
        class_count: 1,
        created_at: null,
        weights_sha256: '0'.repeat(64),
        metrics: null,
      },
    };
    fetchMock.mockResolvedValue(Response.json(payload));
    await expect(service.predict(image)).resolves.toEqual(payload);
    fetchMock.mockResolvedValue(Response.json([part]));
    await expect(service.classes()).resolves.toEqual([part]);
    fetchMock.mockResolvedValue(Response.json(payload.analysis));
    await expect(service.modelInfo()).resolves.toEqual(payload.analysis);
  });
  it('rejects a concurrent inference while capacity is occupied', async () => {
    service = new PartRecognitionService(
      new ConfigService({ AUTOPARTS_AI_MAX_CONCURRENT: 1 }),
    );
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    let complete!: (response: Response) => void;
    fetchMock.mockImplementation(() => {
      signalStarted();
      return new Promise<Response>((resolve) => {
        complete = resolve;
      });
    });
    const first = service.predict(image);
    await started;
    await expect(service.predict(image)).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    complete(new Response('', { status: 503 }));
    await expect(first).rejects.toMatchObject({ status: 503 });
  });
  it('releases capacity after upstream failures', async () => {
    service = new PartRecognitionService(
      new ConfigService({ AUTOPARTS_AI_MAX_CONCURRENT: 1 }),
    );
    fetchMock.mockResolvedValue(new Response('', { status: 503 }));
    await expect(service.predict(image)).rejects.toMatchObject({ status: 503 });
    fetchMock.mockResolvedValue(new Response('', { status: 503 }));
    await expect(service.predict(image)).rejects.toMatchObject({ status: 503 });
  });
});
