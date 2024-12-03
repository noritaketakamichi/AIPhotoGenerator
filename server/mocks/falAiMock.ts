import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const mockServer = express();
mockServer.use(cors());
mockServer.use(bodyParser.json());

// Mock storage for uploaded files
const mockStorage = new Map<string, Buffer>();

// Mock FAL.ai storage endpoint
mockServer.post('/storage/upload', (req, res) => {
  const fileId = `mock-file-${Date.now()}`;
  // In a real scenario, we'd handle file upload. For mock, we'll just return a URL
  const mockUrl = `http://localhost:5001/storage/${fileId}`;
  
  res.json({
    url: mockUrl,
    id: fileId
  });
});

// Mock FAL.ai model endpoint
mockServer.post('/model/train', (req, res) => {
  const modelId = `mock-model-${Date.now()}`;
  
  // Simulate training progress
  setTimeout(() => {
    res.json({
      id: modelId,
      status: 'completed',
      result: {
        model_id: modelId,
        training_steps: 1000,
        loss: 0.0023,
        success: true
      }
    });
  }, 2000); // Simulate 2-second training time
});

// Mock file retrieval endpoint
mockServer.get('/storage/:fileId', (req, res) => {
  const { fileId } = req.params;
  const file = mockStorage.get(fileId);
  
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  
  res.send(file);
});

export const startMockServer = (port: number = 5001) => {
  return new Promise<void>((resolve, reject) => {
    try {
      mockServer.listen(port, () => {
        console.log(`Mock FAL.ai server running on port ${port}`);
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
};

export default mockServer;
