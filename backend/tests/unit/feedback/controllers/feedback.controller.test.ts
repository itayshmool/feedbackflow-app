// backend/tests/unit/feedback/controllers/feedback.controller.test.ts

import { FeedbackController } from '../../../../src/modules/feedback/controllers/feedback.controller';

const mockService: any = {
  createFeedback: jest.fn(),
  getFeedbackList: jest.fn(),
  getFeedbackById: jest.fn(),
  updateFeedback: jest.fn(),
  submitFeedback: jest.fn(),
  deleteFeedback: jest.fn(),
  getFeedbackSummary: jest.fn(),
};

const mockReq = (overrides: any = {}) => ({
  params: {},
  query: {},
  body: {},
  user: { id: 'u1' },
  ...overrides,
} as any);

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const next = jest.fn();

describe('FeedbackController', () => {
  let controller: FeedbackController;

  beforeEach(() => {
    controller = new FeedbackController(mockService);
    jest.clearAllMocks();
  });

  it('createFeedback should return 201 with payload', async () => {
    const req = mockReq({ body: { cycleId: 'c1' } });
    const res = mockRes();
    mockService.createFeedback.mockResolvedValue({ id: 'fb1' });

    await controller.createFeedback(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'fb1' });
  });

  it('getFeedback should return item', async () => {
    const req = mockReq({ params: { id: 'fb1' } });
    const res = mockRes();
    mockService.getFeedbackById.mockResolvedValue({ id: 'fb1' });

    await controller.getFeedback(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ id: 'fb1' });
  });

  it('updateFeedback should pass body and return item', async () => {
    const req = mockReq({ params: { id: 'fb1' }, body: { status: 'submitted' } });
    const res = mockRes();
    mockService.updateFeedback.mockResolvedValue({ id: 'fb1', status: 'submitted' });

    await controller.updateFeedback(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ id: 'fb1', status: 'submitted' });
  });

  it('deleteFeedback should respond 204', async () => {
    const req = mockReq({ params: { id: 'fb1' } });
    const res = mockRes();
    mockService.deleteFeedback.mockResolvedValue(undefined);

    await controller.deleteFeedback(req, res, next);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});
